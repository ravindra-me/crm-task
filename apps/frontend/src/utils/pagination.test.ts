import { getPageItems } from './pagination';

describe('getPageItems', () => {
  it('lists every page when there are only a few', () => {
    expect(getPageItems(1, 1)).toEqual([1]);
    expect(getPageItems(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('collapses the middle around the current page', () => {
    expect(getPageItems(10, 20)).toEqual([1, 'gap', 9, 10, 11, 'gap', 20]);
  });

  it('keeps the same number of items near the edges', () => {
    expect(getPageItems(1, 20)).toEqual([1, 2, 3, 4, 5, 'gap', 20]);
    expect(getPageItems(20, 20)).toEqual([1, 'gap', 16, 17, 18, 19, 20]);
  });
});
