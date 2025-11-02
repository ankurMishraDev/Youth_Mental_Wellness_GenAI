import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
  href?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 48, 
  showText = true, 
  className = '',
  href = '/'
}) => {
  const content = (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image 
        src="/logo.png" 
        alt="CureZ Logo" 
        width={size} 
        height={size}
        className="object-contain"
        priority
      />
      {showText && (
        <div className="flex flex-col -ml-0.5">
          <span className="text-2xl font-bold text-amber-600 bg-clip-textleading-tight">
            CureZ
          </span>
          <span className="text-xs flex justify-center text-white -mt-0.5">for GenZ</span>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="cursor-pointer hover:opacity-80 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
};
