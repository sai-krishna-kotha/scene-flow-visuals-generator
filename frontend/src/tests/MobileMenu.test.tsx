import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MobileWorkspaceMenu } from '../components/navigation/MobileWorkspaceMenu';

// Mock workspace context
const mockSetContext = vi.fn();
const mockClearContext = vi.fn();
let mockCurrentProject: any = null;
let mockCurrentScript: any = null;

vi.mock('../contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({
    currentProject: mockCurrentProject,
    currentScript: mockCurrentScript,
    setContext: mockSetContext,
    clearContext: mockClearContext,
  }),
}));

// Mock ThemeContext
vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'system',
    setTheme: vi.fn(),
  }),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock APIs
vi.mock('../services/api/projects', () => ({
  projectsApi: {
    list: vi.fn().mockResolvedValue({
      items: [
        { id: 'p1', name: 'Project Alpha', description: '', user_id: 'u1', created_at: '', updated_at: '' },
        { id: 'p2', name: 'Project Beta', description: '', user_id: 'u1', created_at: '', updated_at: '' },
      ],
      page: 1,
      page_size: 100,
      total: 2,
      total_pages: 1,
    }),
  },
}));

vi.mock('../services/api/scripts', () => ({
  scriptsApi: {
    listForProject: vi.fn().mockResolvedValue({
      items: [
        { id: 's1', title: 'Script One', full_text: '', orientation_preference: 'all', project_id: 'p1', created_at: '', updated_at: '' },
      ],
      page: 1,
      page_size: 100,
      total: 1,
      total_pages: 1,
    }),
  },
}));

const renderMenu = () =>
  render(
    <MemoryRouter>
      <MobileWorkspaceMenu />
    </MemoryRouter>
  );

describe('MobileWorkspaceMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentProject = { id: 'p1', name: 'Project Alpha', description: '', user_id: 'u1', created_at: '', updated_at: '' };
    mockCurrentScript = { id: 's1', title: 'Script One', full_text: '', orientation_preference: 'all', project_id: 'p1', created_at: '', updated_at: '' };
  });

  it('renders hamburger toggle and opens/closes menu', () => {
    renderMenu();
    
    const toggle = screen.getByTestId('mobile-menu-toggle');
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    
    // Open menu
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    
    // Panel should be visible (opacity-100)
    const panel = screen.getByTestId('mobile-menu-panel');
    expect(panel.className).toContain('opacity-100');
    
    // Close menu
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(panel.className).toContain('opacity-0');
  });

  it('closes menu on Escape key', () => {
    renderMenu();
    
    const toggle = screen.getByTestId('mobile-menu-toggle');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('only allows one section open at a time', async () => {
    renderMenu();
    
    // Open menu
    fireEvent.click(screen.getByTestId('mobile-menu-toggle'));
    
    // Expand project section
    fireEvent.click(screen.getByTestId('mobile-menu-project-toggle'));
    await waitFor(() => {
      expect(screen.getByTestId('mobile-menu-project-list')).toBeInTheDocument();
    });
    
    // Script section should NOT have its list visible yet
    expect(screen.queryByTestId('mobile-menu-script-list')).not.toBeInTheDocument();
    
    // Now expand script section
    fireEvent.click(screen.getByTestId('mobile-menu-script-toggle'));
    await waitFor(() => {
      expect(screen.getByTestId('mobile-menu-script-list')).toBeInTheDocument();
    });
    
    // Project section should now be collapsed
    expect(screen.queryByTestId('mobile-menu-project-list')).not.toBeInTheDocument();
  });

  it('closes menu when selecting a navigation option', async () => {
    renderMenu();
    
    const toggle = screen.getByTestId('mobile-menu-toggle');
    fireEvent.click(toggle);
    
    // Click dashboard link
    fireEvent.click(screen.getByTestId('mobile-menu-dashboard-link'));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes menu when clicking a project option', async () => {
    renderMenu();
    
    const toggle = screen.getByTestId('mobile-menu-toggle');
    fireEvent.click(toggle);
    
    // Expand project section
    fireEvent.click(screen.getByTestId('mobile-menu-project-toggle'));
    await waitFor(() => {
      expect(screen.getByTestId('mobile-menu-project-list')).toBeInTheDocument();
    });
    
    // Click a project
    const projectButton = screen.getByText('Project Beta');
    fireEvent.click(projectButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/projects/p2');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('contains theme toggle control', () => {
    renderMenu();
    
    fireEvent.click(screen.getByTestId('mobile-menu-toggle'));
    expect(screen.getByText('Theme')).toBeInTheDocument();
  });

  it('shows script section only when project is active', () => {
    mockCurrentProject = null;
    mockCurrentScript = null;
    renderMenu();
    
    fireEvent.click(screen.getByTestId('mobile-menu-toggle'));
    expect(screen.queryByTestId('mobile-menu-script-toggle')).not.toBeInTheDocument();
  });
});
