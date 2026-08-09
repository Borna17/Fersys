import {
  useEffect,
  useState,
} from 'react'

type CompanyLogoProps = {
  logoUrl?: string | null
  companyName: string
  className?: string
}

function getInitials(
  value: string,
) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) {
    return 'FT'
  }

  return parts
    .slice(0, 2)
    .map(
      (part) =>
        part[0]?.toUpperCase() ?? '',
    )
    .join('')
}

export default function CompanyLogo({
  logoUrl,
  companyName,
  className = 'h-11 w-11',
}: CompanyLogoProps) {
  const [
    imageFailed,
    setImageFailed,
  ] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [logoUrl])

  if (
    logoUrl &&
    !imageFailed
  ) {
    return (
      <span
        className={`grid shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white shadow-lg shadow-black/15 ${className}`}
        title={companyName}
      >
        <img
          src={logoUrl}
          alt={`Logo tvrtke ${companyName}`}
          className="h-full w-full object-contain p-1.5"
          onError={() =>
            setImageFailed(true)
          }
        />
      </span>
    )
  }

  return (
    <span
      className={`grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 font-black text-white shadow-lg shadow-blue-950/30 ${className}`}
      title={companyName}
    >
      {getInitials(companyName)}
    </span>
  )
}
