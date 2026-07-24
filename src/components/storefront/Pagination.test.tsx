import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { Pagination } from './Pagination';
import React from 'react';

test('renders pagination buttons and handles clicks', () => {
  const setPageMock = vi.fn();
  render(
    <Pagination 
      page={2} 
      totalPages={5} 
      setPage={setPageMock} 
      themeColor="#000000" 
    />
  );

  // Checks total pages
  const buttons = screen.getAllByRole('button');
  expect(buttons.length).toBe(7); // 5 pages + 2 arrows

  // Click on page 3
  fireEvent.click(screen.getByText('3'));
  expect(setPageMock).toHaveBeenCalledWith(3);
});
