import { IconProps } from "../types";

export default function PauseIcon(props: IconProps) {
  return (
    <>
      <svg
        width="160"
        height="254"
        viewBox="0 0 160 254"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <rect y="1" width="55" height="253" rx="6" />
        <rect x="105" width="55" height="253" rx="6" />
      </svg>
    </>
  );
}
