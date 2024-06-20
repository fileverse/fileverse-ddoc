import * as React from "react";
import cn from "classnames";
import { useComposedRefs } from "@radix-ui/react-compose-refs";

export interface TextFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * The label for the text field.
   */
  label?: string;
  /**
   * The left icon for the text field.
   */
  leftIcon?: React.ReactNode;
  /**
   * The right icon for the text field.
   */
  rightIcon?: React.ReactNode;
  /**
   * Whether the text field is valid.
   */
  isValid?: boolean;
  /**
   * The helper text for the text field.
   */
  message?: string;
  /**
   * Event handler for the onChange event.
   */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}
export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      className,
      label,
      type = "text",
      isValid = true,
      message,
      onChange,
      leftIcon,
      rightIcon,
      ...props
    },
    ref
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const composedRef = useComposedRefs(ref, inputRef);

    const focusToInput = React.useCallback(() => {
      inputRef.current?.focus();
    }, []);

    const left = React.useMemo(() => {
      if (leftIcon == null) {
        return;
      }

      const leftElement = React.Children.only(leftIcon);
      if (!React.isValidElement(leftElement)) {
        return;
      }

      return React.cloneElement(leftElement, {
        ...leftElement.props,
        onClick: (e: React.MouseEvent) => {
          leftElement.props.onClick?.(e);
          focusToInput();
        },
        className: cn("absolute left-3 color-text-disabled", {
          "cursor-not-allowed": props.disabled,
        }),
      });
    }, [focusToInput, leftIcon, props.disabled]);

    const right = React.useMemo(() => {
      if (rightIcon == null) {
        return;
      }

      const rightElement = React.Children.only(rightIcon);
      if (!React.isValidElement(rightElement)) {
        return;
      }

      return React.cloneElement(rightElement, {
        ...rightElement.props,
        onClick: (e: React.MouseEvent) => {
          rightElement.props.onClick?.(e);
          focusToInput();
        },
        className: cn(
          "absolute right-3 cursor-pointer color-text-disabled",
          {
            "cursor-not-allowed": props.disabled,
          },
          {
            "text-danger": !isValid,
          }
        ),
      });
    }, [focusToInput, rightIcon, props.disabled, isValid]);

    return (
      <div className="flex flex-col">
        {label ? (
          <label className="mb-2 text-sm font-medium">
            {label}
          </label>
        ) : null}
        <div className="relative flex items-center group">
          {left}
          <input
            type={type}
            className={cn(
              "flex h-9 w-full rounded-md border border-input hover:border-border-hover bg-transparent px-3 py-2 text-body-sm  color-text-default transition-colors file:border-0 file:bg-transparent file:text-body-sm placeholder:color-text-disabled focus-visible:outline-none focus-visible:border-border-hover",
              { "pr-3 pl-10": left },
              { "pr-10": right },
              { "border-danger": !isValid },
              {
                "disabled:cursor-not-allowed disabled:bg-disabled disabled:border-disabled disabled:color-text-disabled":
                  props.disabled,
              },
              className
            )}
            onChange={onChange}
            ref={composedRef}
            {...props}
          />
          {right}
        </div>
        {message ? (
          <p
            className={cn("text-sm mt-2 font-normal text-wrap text-justify", {
              "text-danger": !isValid,
              "text-secondary": isValid,
            })}
          >
            {message}
          </p>
        ) : null}
      </div>
    );
  }
);
TextField.displayName = "TextField";
