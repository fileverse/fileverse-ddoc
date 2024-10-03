import { useState } from 'react';
import {
    Button,
    LucideIcon,
    Command,
    CommandInput,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    Popover,
    PopoverContent,
    PopoverTrigger,
    CommandList,
    cn,
} from '@fileverse/ui';

export interface TagProps {
    name: string;
    color: string;
}

export interface TagInputProps {
    tags: TagProps[];
    selectedTags: TagProps[];
    onAddTag: (tag: TagProps) => void;
    isPreviewMode: boolean;
}

const TagInput = ({ tags, selectedTags, onAddTag, isPreviewMode }: TagInputProps) => {
    const [inputValue, setInputValue] = useState('');
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const handleInputChange = (value: string) => {
        setInputValue(value);
        setIsPopoverOpen(true);
    };

    const handleTagSelect = (selectedValue: string) => {
        const selectedTag = tags.find(tag => tag.name.toLowerCase() === selectedValue.toLowerCase());
        if (selectedTag) {
            onAddTag(selectedTag);
        }
        setInputValue('');
        setIsPopoverOpen(false);
    };

    const handleAddTag = () => {
        if (inputValue.trim()) {
            const existingTag = tags.find(tag => tag.name.toLowerCase() === inputValue.toLowerCase());
            if (existingTag) {
                onAddTag(existingTag);
            }
            setInputValue('');
        }
        setIsPopoverOpen(false);
    };

    const isTagSelected = (tagName: string) => {
        return selectedTags.some(tag => tag.name.toLowerCase() === tagName.toLowerCase());
    };

    if (isPreviewMode) {
        return null;
    }

    return (
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
                <div className="flex items-center">
                    <Button onClick={handleAddTag} size="md" variant="ghost" className='min-w-fit !h-8 px-2'>
                        <LucideIcon name="Plus" size="sm" className="mr-1 text-[#77818A]" />
                        <span className='text-[#77818A]'>Add Tag</span>
                    </Button>
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-52" align="center">
                <Command>
                    <CommandInput
                        placeholder="Search tags..."
                        value={inputValue}
                        onValueChange={handleInputChange}
                    />
                    <CommandList className='overflow-y-auto max-h-40'>
                        <CommandEmpty>No tags found</CommandEmpty>
                        <CommandGroup>
                            {tags
                                .filter(tag => tag.name.toLowerCase().includes(inputValue.toLowerCase()))
                                .map((tag, index) => (
                                    <CommandItem
                                        key={index}
                                        value={tag.name}
                                        onSelect={handleTagSelect}
                                        className={cn(isTagSelected(tag.name) ? 'opacity-50 pointer-events-none' : '')}
                                    >
                                        {tag.name}
                                    </CommandItem>
                                ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover >
    );
};

export { TagInput };