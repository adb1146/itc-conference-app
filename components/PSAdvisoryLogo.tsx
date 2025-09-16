export function PSAdvisoryLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <div className={`${className} flex items-center justify-center font-bold text-white`}>
      <span style={{ fontSize: '0.6em' }}>PS</span>
    </div>
  )
}