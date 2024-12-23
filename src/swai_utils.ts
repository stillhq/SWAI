import { exec } from "child_process";

export function wildcardMatch(str: string, pattern: string): boolean {
    // Escape special characters in the pattern and replace '*' with '.*'
    const regexPattern = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(str);
}

export function openUrl(url: string): void {
    const command = `xdg-open "${url}"`;
    exec(command, (error: Error | null) => {
        if (error) {
            console.error('Failed to open URL:', error);
        }
    });
}