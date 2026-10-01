import { clearCommands, getRegisteredCommands, registerCommand } from '../registry';

describe('command registry', () => {
  afterEach(() => {
    clearCommands();
  });

  it('starts empty', () => {
    expect(getRegisteredCommands()).toEqual([]);
  });

  it('registers a command and makes it retrievable', () => {
    registerCommand({ id: 'nav-milestones', label: 'Go to Milestones', keywords: ['milestones'], href: '/milestones' });

    const commands = getRegisteredCommands();
    expect(commands).toHaveLength(1);
    expect(commands[0]).toMatchObject({ id: 'nav-milestones', label: 'Go to Milestones', href: '/milestones' });
  });

  it('does not create duplicate entries when the same id is registered twice', () => {
    registerCommand({ id: 'nav-milestones', label: 'Go to Milestones', keywords: ['milestones'], href: '/milestones' });
    registerCommand({ id: 'nav-milestones', label: 'Go to Milestones', keywords: ['milestones'], href: '/milestones' });

    expect(getRegisteredCommands()).toHaveLength(1);
  });

  it('overwrites the previous entry when re-registering an existing id with new data', () => {
    registerCommand({ id: 'nav-milestones', label: 'Old Label', keywords: ['old'], href: '/old' });
    registerCommand({ id: 'nav-milestones', label: 'Go to Milestones', keywords: ['milestones'], href: '/milestones' });

    const commands = getRegisteredCommands();
    expect(commands).toHaveLength(1);
    expect(commands[0]).toMatchObject({ label: 'Go to Milestones', href: '/milestones' });
  });

  it('supports multiple distinct commands', () => {
    registerCommand({ id: 'nav-milestones', label: 'Go to Milestones', keywords: ['milestones'], href: '/milestones' });
    registerCommand({ id: 'nav-contracts', label: 'Go to Contracts', keywords: ['contracts'], href: '/contracts' });

    expect(getRegisteredCommands()).toHaveLength(2);
  });

  it('clearCommands removes all registered commands', () => {
    registerCommand({ id: 'nav-milestones', label: 'Go to Milestones', keywords: ['milestones'], href: '/milestones' });
    clearCommands();

    expect(getRegisteredCommands()).toEqual([]);
  });
});
