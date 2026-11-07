import type { ReactNode } from "react";

import type { UiIconName } from "../types";

export default function UiIcon({ name }: { name: UiIconName }) {
    const paths: Record<UiIconName, ReactNode> = {
        board: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M15 4v16" /></>,
        home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
        tasks: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="m3 6 1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2" /></>,
        inbox: <><path d="M4 4h16v14H4z" /><path d="M4 14h4l2 3h4l2-3h4" /></>,
        report: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
        plus: <path d="M12 5v14M5 12h14" />,
        calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    };

    return <svg className="uiIcon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
