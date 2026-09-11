import type { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            src="/images/logo.png"
            alt="Logo PT. Gajah Angkasa Perkasa"
            {...props}
            className={`object-contain ${props.className || 'size-9'}`}
        />
    );
}
