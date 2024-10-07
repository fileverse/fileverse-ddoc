import { Extension, textInputRule } from '@tiptap/core';

const superscriptOrdinal = Extension.create({
  name: 'superscriptOrdinal',

  addInputRules() {
    return [
      textInputRule({
        find: /1st\b/,
        replace: '1ˢᵗ' 
      }),
      textInputRule({
        find: /2nd\b/,
        replace: '2ⁿᵈ'
      }),
      textInputRule({
        find: /3rd\b/,
        replace: '3ʳᵈ'
      }),
      textInputRule({
        find: /4th\b/,
        replace: '4ᵗʰ'
      }),
      textInputRule({
        find: /5th\b/,
        replace: '5ᵗʰ'
      }),
      textInputRule({
        find: /6th\b/,
        replace: '6ᵗʰ'
      }),
      textInputRule({
        find: /7th\b/,
        replace: '7ᵗʰ'
      }),
      textInputRule({
        find: /8th\b/,
        replace: '8ᵗʰ'
      }),
      textInputRule({
        find: /9th\b/,
        replace: '9ᵗʰ'
      }),
      textInputRule({
        find: /10th\b/,
        replace: '10ᵗʰ'
      }),
      textInputRule({
        find: /11th\b/,
        replace: '11ᵗʰ'
      }),
      textInputRule({
        find: /12th\b/,
        replace: '12ᵗʰ'
      }),
      textInputRule({
        find: /13th\b/,
        replace: '13ᵗʰ'
      }),
      textInputRule({
        find: /14th\b/,
        replace: '14ᵗʰ'
      }),
      textInputRule({
        find: /15th\b/,
        replace: '15ᵗʰ'
      }),
      textInputRule({
        find: /16th\b/,
        replace: '16ᵗʰ'
      }),
      textInputRule({
        find: /17th\b/,
        replace: '17ᵗʰ'
      }),
      textInputRule({
        find: /18th\b/,
        replace: '18ᵗʰ'
      }),
      textInputRule({
        find: /19th\b/,
        replace: '19ᵗʰ'
      }),
      textInputRule({
        find: /20th\b/,
        replace: '20ᵗʰ'
      }),
      textInputRule({
        find: /21st\b/,
        replace: '21ˢᵗ'
      }),
      textInputRule({
        find: /22nd\b/,
        replace: '22ⁿᵈ'
      }),
      textInputRule({
        find: /23rd\b/,
        replace: '23ʳᵈ'
      }),
      textInputRule({
        find: /24th\b/,
        replace: '24ᵗʰ'
      }),
      textInputRule({
        find: /25th\b/,
        replace: '25ᵗʰ'
      }),
      textInputRule({
        find: /26th\b/,
        replace: '26ᵗʰ'
      }),
      textInputRule({
        find: /27th\b/,
        replace: '27ᵗʰ'
      }),
      textInputRule({
        find: /28th\b/,
        replace: '28ᵗʰ'
      }),
      textInputRule({
        find: /29th\b/,
        replace: '29ᵗʰ'
      }),
      textInputRule({
        find: /30th\b/,
        replace: '30ᵗʰ'
      }),
      textInputRule({
        find: /31st\b/,
        replace: '31ˢᵗ'
      }),
    ];
  },
});

export default superscriptOrdinal;
