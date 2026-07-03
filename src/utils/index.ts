export function createPageUrl(pageName: string) {
    return '/' + pageName.replace(/ /g, '-');
}

export function cn(...classes: (string | boolean | undefined | null)[]) {
    return classes.filter(Boolean).join(' ');
}