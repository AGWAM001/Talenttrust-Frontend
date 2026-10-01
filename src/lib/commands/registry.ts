/** A single action exposed through the global command palette. */
export interface PaletteCommand {
  /** Stable, unique identifier. Re-registering the same id replaces the entry. */
  id: string;
  /** Human-readable label shown in the palette list. */
  label: string;
  /** Extra terms the palette matches against when filtering, alongside the label. */
  keywords: readonly string[];
  /** Route the palette navigates to when this command is activated. */
  href: string;
}

const registeredCommands = new Map<string, PaletteCommand>();

/**
 * Registers a command with the palette. Registering with an id that already
 * exists overwrites the previous entry instead of creating a duplicate.
 */
export function registerCommand(command: PaletteCommand): void {
  registeredCommands.set(command.id, command);
}

/** Returns all currently registered commands. */
export function getRegisteredCommands(): PaletteCommand[] {
  return Array.from(registeredCommands.values());
}

/** Removes every registered command. Intended for test isolation. */
export function clearCommands(): void {
  registeredCommands.clear();
}
