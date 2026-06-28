'use client';

import { useState, useCallback } from 'react';

type FeatureCardProps = {
    title: string;
    desc: string;
    img: string;
};

export function FeatureCard({ title, desc, img }: FeatureCardProps) {
    const [open, setOpen] = useState(false);

    const close = useCallback(() => setOpen(false), []);

    return (
        <>
            <div
                className="group cursor-pointer rounded-xl border border-white/5 bg-bg-card p-6 transition-colors hover:bg-bg-card-hover"
                onClick={() => setOpen(true)}
            >
                <img src={img} alt={title} className="mb-4 h-40 w-full rounded-lg object-contain bg-black border border-white/5" />
                <h3 className="mb-2 text-lg font-bold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-zinc-400">{desc}</p>
            </div>

            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                    onClick={close}
                >
                    <div className="relative max-h-[90vh] max-w-[90vw] border border-white/5 rounded-2xl" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={close}
                            className="absolute -right-3 -top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-white transition-colors hover:bg-zinc-600"
                        >
                            ✕
                        </button>
                        <img src={img} alt={title} className="max-h-[85vh] rounded-xl object-contain" />
                    </div>
                </div>
            )}
        </>
    );
}
