# dDoc Performance Analysis - Typing Jank at ~20,000 Words

## Problem Summary
When the dDoc editor reaches approximately 20,000 words, typing becomes very janky (laggy/stuttery). Based on the Firefox profiler screenshot, this appears to be a **DOM traversal and node calculation performance issue**.

## Key Performance Bottlenecks Identified

### 1. **Rkn/</c>** Function (50% of samples)
- **Running samples**: 1% (36 samples)
- **Total time**: 50% of profiling period
- This appears to be a React or rendering-related function
- High call frequency suggests it's being triggered on every keystroke

### 2. **nodesBetween** Chain (37-50% combined)
- Multiple calls consuming 37% of samples each
- Located at: `https://fileverse-ddoc.vercel.app/assets/index-YlvFAYcJ.js:48:15876`
- This is a **ProseMirror document traversal function**
- Being called repeatedly, likely on every input event

### 3. **get nodeSize** Function (0.9-4.8%)
- Multiple instances with 0.9%, 1.0%, 4.2%, 4.6%, 4.8%
- This calculates the size of nodes in the ProseMirror document
- High frequency suggests unnecessary recalculations

### 4. **dispatchTransaction** (0.8%)
- Core ProseMirror transaction handler
- Every edit triggers this, which is normal
- The issue is what's happening *inside* each transaction

### 5. **updateState** (0.5%)
- State update mechanism
- Should be efficient but may be triggering too many dependent computations

## Root Cause Analysis

### Primary Issue: Document Traversal on Every Keystroke

The profiler shows that **`nodesBetween`** is being called extensively. This function traverses a range of the ProseMirror document, and with a 20,000-word document, this becomes computationally expensive.

**Common causes:**
1. **Decorations recalculation** - If you're using decorations (for syntax highlighting, comments, etc.), they may be recalculating on every keystroke
2. **Plugin state updates** - Plugins that traverse the document to update their state
3. **Position calculations** - Code that needs to calculate positions in the document
4. **Selection-based computations** - Features that depend on the current selection position

### Secondary Issues

1. **React re-renders** (Rkn/c at 50%) - The entire React component tree may be re-rendering
2. **Node size calculations** - Repeatedly measuring node sizes suggests layout recalculations

## Likely Culprits in Your Codebase

Based on the file structure, these are the most likely sources:

### 1. **Inline Comments Extension**
```
package/components/inline-comment/
```
- Comment systems often traverse the document to find comment positions
- May be recalculating comment positions on every keystroke

### 2. **Table of Contents (TOC)**
```
package/components/toc/
```
- TOC typically traverses the document to find all headings
- Should use a debounced update, not update on every keystroke

### 3. **Sync Cursor Extension**
```
package/extensions/sync-cursor.ts
```
- Collaborative editing features that sync cursor positions
- May be unnecessarily broadcasting or recalculating

### 4. **Custom Extensions**
- `action-button` - If it traverses to find button positions
- `ai-writer` - If it scans the document for AI context
- `collapsible-heading` - If it recalculates heading states

## Recommended Fixes

### Immediate Actions (High Priority)

#### 1. **Debounce Expensive Operations**
```typescript
import { debounce } from 'lodash';

// In your plugin/extension
const updateTOC = debounce((state) => {
  // Traverse document and update TOC
}, 300); // 300ms delay

// In your plugin's apply method
apply(tr, value, oldState, newState) {
  if (tr.docChanged) {
    updateTOC(newState);
  }
  return value;
}
```

#### 2. **Use appendTransaction Instead of Decorations**
If you're using decorations that require document traversal, consider whether they can be computed less frequently:

```typescript
// Instead of computing decorations on every transaction
appendTransaction(transactions, oldState, newState) {
  // Only update when specific conditions are met
  const shouldUpdate = transactions.some(tr => 
    tr.docChanged && tr.getMeta('updateDecorations')
  );
  
  if (!shouldUpdate) return null;
  
  // Compute decorations
  return updateDecorations(newState);
}
```

#### 3. **Optimize nodesBetween Usage**
Instead of traversing the entire document:

```typescript
// BAD: Traversing entire document
doc.nodesBetween(0, doc.content.size, (node, pos) => {
  // Process every node
});

// GOOD: Only traverse changed range
if (tr.docChanged) {
  tr.steps.forEach(step => {
    const { from, to } = step.getMap().maps[0];
    doc.nodesBetween(from, to, (node, pos) => {
      // Only process affected nodes
    });
  });
}
```

#### 4. **Memoize Position Calculations**
```typescript
// Cache node positions
const positionCache = new Map();

function getNodePosition(node, doc) {
  const cacheKey = node.attrs.id; // Use stable identifier
  if (positionCache.has(cacheKey)) {
    return positionCache.get(cacheKey);
  }
  
  let position = null;
  doc.descendants((n, pos) => {
    if (n.attrs.id === cacheKey) {
      position = pos;
      return false; // Stop traversal
    }
  });
  
  positionCache.set(cacheKey, position);
  return position;
}

// Clear cache on document changes
plugin.spec.state = {
  apply(tr, value) {
    if (tr.docChanged) {
      positionCache.clear();
    }
    return value;
  }
}
```

### Medium Priority Fixes

#### 5. **Virtualize Long Documents**
For very long documents, consider virtualizing content:
- Only render visible content + buffer
- Use IntersectionObserver to lazy-load sections
- This is complex but provides best performance

#### 6. **Optimize React Renders**
```typescript
// Use React.memo for expensive components
export const EditorComponent = React.memo(({ editor }) => {
  // Component code
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.editor === nextProps.editor;
});

// Use useMemo for expensive computations
const decorations = useMemo(() => {
  return computeDecorations(editorState);
}, [editorState.doc]); // Only recompute when doc changes
```

#### 7. **Profile Individual Extensions**
Temporarily disable extensions one by one to identify the culprit:

```typescript
const extensions = [
  StarterKit,
  // Comment out to test:
  // InlineComment,
  // TableOfContents,
  // SyncCursor,
  // etc.
];
```

### Long-term Optimizations

#### 8. **Implement Change Tracking**
```typescript
// Track what actually changed
plugin.spec.state = {
  apply(tr, value, oldState, newState) {
    if (!tr.docChanged) return value;
    
    // Only process changed ranges
    const changes = [];
    tr.mapping.maps.forEach((map, i) => {
      map.forEach((oldStart, oldEnd, newStart, newEnd) => {
        changes.push({ oldStart, oldEnd, newStart, newEnd });
      });
    });
    
    // Use changes to optimize updates
    return updateValueForChanges(value, changes, newState);
  }
}
```

#### 9. **Use Web Workers for Heavy Computations**
Offload document analysis to a web worker:
```typescript
// worker.ts
self.onmessage = (e) => {
  const { doc } = e.data;
  const toc = extractTableOfContents(doc);
  self.postMessage({ toc });
};

// main.ts
const worker = new Worker('worker.ts');
worker.postMessage({ doc: editor.state.doc.toJSON() });
worker.onmessage = (e) => {
  setTOC(e.data.toc);
};
```

## Testing Your Fixes

### 1. **Before/After Profiling**
- Record a profile with the issue
- Apply a fix
- Record another profile
- Compare the percentage of time spent in problematic functions

### 2. **Create a Performance Test**
```typescript
// performance-test.ts
const startTime = performance.now();

// Simulate typing 100 characters
for (let i = 0; i < 100; i++) {
  editor.commands.insertContent('a');
}

const endTime = performance.now();
console.log(`Typing 100 chars took ${endTime - startTime}ms`);
// Target: < 100ms total (< 1ms per character)
```

### 3. **Metrics to Track**
- **Input latency**: Time from keypress to screen update (target: < 16ms for 60fps)
- **Frame drops**: Any frames taking > 16ms
- **Memory usage**: Check for memory leaks in long documents

## Quick Diagnosis Commands

### In Browser Console:
```javascript
// Check ProseMirror state size
console.log(editor.state.doc.nodeSize);

// Count plugins
console.log(editor.state.plugins.length);

// Profile a transaction
console.time('transaction');
editor.commands.insertContent('test');
console.timeEnd('transaction');

// Check decoration count
let decorationCount = 0;
editor.state.plugins.forEach(plugin => {
  const decorations = plugin.spec.decorations?.(editor.state);
  if (decorations) {
    decorations.find().forEach(() => decorationCount++);
  }
});
console.log('Total decorations:', decorationCount);
```

## Expected Improvements

After implementing these fixes, you should see:

1. **nodesBetween**: Reduce from 37-50% to < 5%
2. **get nodeSize**: Reduce from 4.8% to < 1%
3. **React renders (Rkn/c)**: Reduce from 50% to < 10%
4. **Overall typing latency**: < 16ms per keystroke (currently appears to be 100ms+)

## Next Steps

1. **Start with the easiest win**: Add debouncing to TOC updates
2. **Profile again**: Use Firefox Profiler to confirm improvement
3. **Identify specific extension**: Disable extensions one by one
4. **Implement targeted fix**: Focus on the most expensive operation
5. **Test with real content**: Use a 20,000-word document for testing

## Additional Resources

- [ProseMirror Performance Guide](https://prosemirror.net/docs/guide/#performance)
- [React Profiler Documentation](https://react.dev/reference/react/Profiler)
- [Web Performance APIs](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API)

---

**Note**: The fact that this issue appears at ~20,000 words suggests O(n) or worse complexity in some operation. The goal is to make operations O(1) or at worst O(log n) with respect to document size.
