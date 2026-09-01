import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import { MoreMenu, MoreMenuItem } from '../components/ui/MoreMenu';
import { DeleteConfirmationDialog } from '../components/ui/DeleteConfirmationDialog';

describe('MoreMenu & Delete UX', () => {
  it('toggles menu visibility', () => {
    const handleAction = vi.fn();
    render(
      <MoreMenu>
        <MoreMenuItem onClick={handleAction}>Edit</MoreMenuItem>
        <MoreMenuItem destructive onClick={handleAction}>Delete</MoreMenuItem>
      </MoreMenu>
    );
    
    // Initially hidden
    expect(screen.queryByText('Edit')).toBeNull();
    expect(screen.queryByText('Delete')).toBeNull();

    // Click trigger
    fireEvent.click(screen.getByRole('button', { name: /more options/i }));

    // Now visible
    expect(screen.getByText('Edit')).toBeDefined();
    expect(screen.getByText('Delete')).toBeDefined();

    // Click outside should close, but jsdom doesn't fully support outside click natively,
    // so we can test the menu item click
    fireEvent.click(screen.getByText('Delete'));
    expect(handleAction).toHaveBeenCalledTimes(1);
    // Menu closes after action
    expect(screen.queryByText('Delete')).toBeNull();
  });
});

describe('DeleteConfirmationDialog', () => {
  it('renders confirmation dialog with correct warning text', () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <DeleteConfirmationDialog
        isOpen={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="Delete Item"
        itemName="Test Project"
        isDeleting={false}
        warnings={['all scripts in this project', 'all scenes']}
        deleteButtonText="Confirm Delete"
      />
    );

    expect(screen.getByText('Delete Item')).toBeDefined();
    expect(screen.getByText(/Are you sure you want to delete/)).toBeDefined();
    expect(screen.getByText(/"Test Project"/)).toBeDefined();
    expect(screen.getByText('all scripts in this project')).toBeDefined();
    expect(screen.getByText('all scenes')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDefined();
    expect(screen.getByRole('button', { name: /Confirm Delete/ })).toBeDefined();
  });

  it('triggers onClose when Cancel is clicked', () => {
    const handleClose = vi.fn();
    
    render(
      <DeleteConfirmationDialog
        isOpen={true}
        onClose={handleClose}
        onConfirm={vi.fn()}
        title="Delete Item"
        itemName="Test Project"
        isDeleting={false}
        warnings={['all scripts in this project', 'all scenes']}
        deleteButtonText="Confirm Delete"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('triggers onConfirm when Delete button is clicked', () => {
    const handleConfirm = vi.fn();
    
    render(
      <DeleteConfirmationDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={handleConfirm}
        title="Delete Item"
        itemName="Test Project"
        isDeleting={false}
        warnings={['all scripts in this project', 'all scenes']}
        deleteButtonText="Confirm Delete"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Confirm Delete/ }));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows loading state and prevents duplicate clicks when isDeleting is true', () => {
    const handleConfirm = vi.fn();
    const handleClose = vi.fn();
    
    render(
      <DeleteConfirmationDialog
        isOpen={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="Delete Item"
        itemName="Test Project"
        isDeleting={true}
        warnings={['all scripts in this project', 'all scenes']}
        deleteButtonText="Confirm Delete"
      />
    );

    // Cancel should be disabled
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    expect(cancelButton.hasAttribute('disabled')).toBe(true);

    // Confirm should be loading
    const confirmButton = screen.getByRole('button', { name: /Deleting.../ });
    expect(confirmButton.hasAttribute('disabled')).toBe(true);
    
    // Clicks should not trigger handlers
    fireEvent.click(cancelButton);
    fireEvent.click(confirmButton);
    expect(handleClose).not.toHaveBeenCalled();
    expect(handleConfirm).not.toHaveBeenCalled();
  });
});
