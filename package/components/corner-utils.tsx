
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import cn from 'classnames';
import { useMediaQuery, useOnClickOutside } from 'usehooks-ts';
import { Button, LucideIcon } from '@fileverse/ui';

interface OptionTypes {
    icon: JSX.Element;
    tooltip: string;
    disabled: boolean;
    command: () => void;
}

const CornerUtils = () => {
    const [isOpen, setIsOpen] = useState(false);
    const toggleRef = useRef(null);
    const optionsRef = useRef(null);

    const isMobile = useMediaQuery('(max-width: 840px)');

    useOnClickOutside(toggleRef, (event) => {
        if (
            toggleRef.current &&
            optionsRef.current &&
            // @ts-ignore
            !toggleRef.current.contains(event.target) &&
            // @ts-ignore
            !optionsRef.current.contains(event.target)
        ) {
            setIsOpen(false);
        }
    });

    const toggleOpen = () => setIsOpen(!isOpen);

    const options: OptionTypes[] = [
        {
            icon: <LucideIcon name="Pen" size="md" />,
            tooltip: 'New document',
            disabled: false,
            command: () => window.open('/document/create', '_blank'),
        },
        {
            icon: <LucideIcon name="CircleHelp" size="md" />,
            tooltip: 'Know more',
            disabled: false,
            command: () => null,
        },
        {
            icon: <LucideIcon name="Database" size="md" />,
            tooltip: 'Storage. Soon',
            disabled: true,
            command: () => null,
        },
    ];

    return (
        <div className="relative">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        ref={optionsRef}
                        className={cn(
                            'fixed right-[5rem] bottom-0 flex flex-col-reverse items-end',
                            { '!-translate-y-28': isMobile, 'translate-y-0': !isMobile }
                        )}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                    >
                        {options.map((option, index) => (
                            <motion.div
                                key={index}
                                className={cn('mb-2 last:-mb-[26px] last:-mr-1')}
                                data-tip={option.tooltip}
                                initial={{ scale: 0, opacity: 0, y: 25, x: 0 }}
                                animate={{
                                    scale: 1,
                                    opacity: 1,
                                    y: 0,
                                    x:
                                        index *
                                        Math.cos(((index + 1) * Math.PI) / options.length) *
                                        -34,
                                }}
                                exit={{ scale: 0, opacity: 0, y: 25, x: 0 }}
                            >
                                <Button
                                    onClick={option.command}
                                    disabled={option.disabled}
                                    className="w-12 h-12 min-w-fit aspect-square rounded-full shadow-lg"
                                >
                                    {option.icon}
                                </Button>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
            <div
                className={cn('fixed right-0 bottom-0 m-6', {
                    '-translate-y-28': isMobile,
                    'translate-y-0': !isMobile,
                })}
                ref={toggleRef}
            >
                <Button
                    className="w-12 h-12 min-w-fit aspect-square rounded-full shadow-lg"
                    onClick={toggleOpen}
                >
                    <motion.div animate={{ rotate: isOpen ? 135 : 0 }}>
                        <LucideIcon name="Plus" size="md" />
                    </motion.div>
                </Button>
            </div>
        </div>
    );
};

export { CornerUtils };
