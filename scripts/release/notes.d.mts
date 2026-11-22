/** The body of a changelog's `## <version>` section, or undefined. */
export function sectionFor(changelog: string, version: string): string | undefined;

/** Whether a section says nothing but that its siblings were updated. */
export function onlyDependencyUpdates(section: string): boolean;

/** The release's notes, as Markdown. */
export function releaseNotes(release: {
  version: string;
  packages: { name: string; changelog: string | undefined; version?: string }[];
}): string;
