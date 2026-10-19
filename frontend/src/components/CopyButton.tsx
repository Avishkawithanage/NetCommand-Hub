import { useEffect, useRef, useState } from "react";
import { copyText } from "../lib/files";
import { Icon } from "./Icon";
import { useToast } from "./Toast";

interface Props {
  text: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function CopyButton({ text, label = "Copy", className = "btn btn-sm", disabled }: Props) {
  const [done, setDone] = useState(false);
  const toast = useToast();
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  const onClick = async () => {
    const ok = await copyText(text);
    if (ok) {
      setDone(true);
      toast.show("Copied to clipboard", "success");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setDone(false), 1800);
    } else {
      toast.show("Copy failed - select the text and copy it manually", "error");
    }
  };

  return (
    <button type="button" className={className} onClick={onClick} disabled={disabled || !text}>
      <Icon name={done ? "check" : "copy"} size={15} />
      <span>{done ? "Copied" : label}</span>
    </button>
  );
}
