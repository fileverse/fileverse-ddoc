interface SpinnerProps {
  height?: number
  width?: number
}
export const Spinner = ({ height, width }: SpinnerProps) => {
  return (
    <span className="flex items-center justify-center ">
      <span
        className={`${width ? `w-${width}` : 'w-8'} ${
          height ? `h-${height}` : 'h-8'
        } border-4 border-t-4 border-t-[#ccc] border-gray-500 rounded-full animate-spin`}
      />
    </span>
  )
}
export default Spinner
