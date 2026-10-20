import { expect, test, type Page } from '@playwright/test';

const contactLinks = (page: Page) => page.locator('a[href^="/contacts/"]');

async function openFirstContact(page: Page) {
  await page.goto('/?sortBy=name&sortOrder=asc');
  await contactLinks(page).first().click();
  await expect(page.getByRole('heading', { name: 'Details' })).toBeVisible();
}

test('search narrows the list and survives a reload', async ({ page }) => {
  await page.goto('/');
  await expect(contactLinks(page).first()).toBeVisible();

  const lastName = (await contactLinks(page).first().innerText()).split(' ').at(-1) ?? '';
  await page.getByRole('searchbox', { name: 'Search contacts' }).fill(lastName);
  await expect(page).toHaveURL(new RegExp(`search=${lastName}`));
  await expect(contactLinks(page).first()).toContainText(lastName);

  await page.reload();
  await expect(page.getByRole('searchbox', { name: 'Search contacts' })).toHaveValue(lastName);
});

test('shows an empty state when nothing matches', async ({ page }) => {
  await page.goto('/?search=zzzz-no-such-person');
  await expect(page.getByRole('heading', { name: 'No contacts match' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).first().click();
  await expect(contactLinks(page).first()).toBeVisible();
});

test('edit a contact and see it in the activity history', async ({ page }) => {
  await openFirstContact(page);
  const company = `QA Co ${Date.now()}`;

  await page.getByLabel(/company/i).fill(company);
  await page.getByRole('button', { name: 'Save changes' }).click();

  await expect(page.getByText('Contact saved')).toBeVisible();
  const activity = page.getByRole('list', { name: 'Recent activity' });
  await expect(activity).toContainText('Details updated');
  await expect(activity).toContainText(company);
});

test('add and remove a tag', async ({ page }) => {
  await openFirstContact(page);
  const tag = `e2e-${Date.now()}`;

  await page.getByRole('combobox', { name: 'Add a tag' }).fill(tag);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  const tags = page.getByRole('list', { name: 'Assigned tags' });
  await expect(tags).toContainText(tag);

  await page.getByRole('button', { name: `Remove tag ${tag}` }).click();
  await expect(tags.or(page.getByText('No tags yet.'))).not.toContainText(tag);
  await expect(page.getByRole('list', { name: 'Recent activity' })).toContainText(
    `Tag "${tag}" removed`,
  );
});

test('stale edit from a second tab is caught instead of overwriting', async ({ browser }) => {
  const userA = await browser.newPage();
  const userB = await browser.newPage();
  await openFirstContact(userA);
  await userB.goto(userA.url());

  await userB.getByLabel(/company/i).fill('Saved by B');
  await userB.getByRole('button', { name: 'Save changes' }).click();
  await expect(userB.getByText('Contact saved')).toBeVisible();

  await userA.getByLabel(/company/i).fill('Saved by A');
  await userA.getByRole('button', { name: 'Save changes' }).click();

  await expect(userA.getByText(/someone else updated this contact/i)).toBeVisible();
  await expect(userA.getByRole('cell', { name: 'Saved by B' })).toBeVisible();

  await userA.getByRole('button', { name: /use saved version/i }).click();
  await expect(userA.getByLabel(/company/i)).toHaveValue('Saved by B');
});

test('add tags button explains itself until contacts are selected', async ({ page }) => {
  await page.goto('/?sortBy=name&sortOrder=asc');
  const addTags = page.getByRole('button', { name: /^Add tags/ });

  await expect(addTags).toHaveAttribute('aria-disabled', 'true');
  await addTags.hover();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await expect(page.getByRole('tooltip')).toHaveText(
    'Select contacts in the table to add tags to them',
  );

  await addTags.click({ force: true });
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('bulk tag selected contacts from the modal', async ({ page }) => {
  await page.goto('/?sortBy=name&sortOrder=asc');
  const tag = `bulk-${Date.now()}`;

  const rowBoxes = page.getByRole('checkbox', { name: /^Select (?!all)/ });
  await rowBoxes.nth(0).check();
  await rowBoxes.nth(1).check();
  await expect(page.getByText('2 selected')).toBeVisible();

  await page.getByRole('button', { name: 'Add tags (2)' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add tags to 2 contacts' });
  await expect(dialog).toBeVisible();

  await dialog.getByLabel('New tag name').fill(tag);
  await dialog.getByRole('button', { name: 'Add', exact: true }).click();
  await dialog.getByRole('button', { name: 'Add 1 tag' }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText(`Added "${tag}" to 2 contacts`)).toBeVisible();
  await expect(page.getByText('2 selected')).toBeHidden();
  await expect(page.getByRole('button', { name: /^Add tags/ })).toHaveAttribute(
    'aria-disabled',
    'true',
  );

  await contactLinks(page).nth(1).click();
  await expect(page.getByRole('list', { name: 'Assigned tags' })).toContainText(tag);
});

test('escape closes the tag modal without changes', async ({ page }) => {
  await page.goto('/?sortBy=name&sortOrder=asc');
  await page
    .getByRole('checkbox', { name: /^Select (?!all)/ })
    .first()
    .check();
  await page.getByRole('button', { name: 'Add tags (1)' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.keyboard.press('Escape');

  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText('1 selected')).toBeVisible();
});

test('sort by clicking a column header', async ({ page, isMobile }) => {
  test.skip(isMobile, 'cards have no column headers; mobile sorts with the Sort by select');
  await page.goto('/');
  const nameHeader = page.getByRole('columnheader', { name: 'Name' });

  await nameHeader.getByRole('button').click();
  await expect(page).toHaveURL(/sortBy=name&sortOrder=asc/);
  await expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
  const firstAscending = await contactLinks(page).first().innerText();

  await nameHeader.getByRole('button').click();
  await expect(page).toHaveURL(/sortBy=name&sortOrder=desc/);
  await expect(nameHeader).toHaveAttribute('aria-sort', 'descending');
  await expect(contactLinks(page).first()).not.toHaveText(firstAscending);
});
