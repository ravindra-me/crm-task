export interface Tag {
  id: number;
  name: string;
}

export interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  tags: Tag[];
  version: number;
  created_at: string;
  updated_at: string;
}

export interface ContactPage {
  items: Contact[];
  total: number;
  page: number;
  page_size: number;
}

export type EditableField = 'first_name' | 'last_name' | 'email' | 'phone' | 'company';

export type ContactChanges = Partial<Record<EditableField, string | null>>;

export interface ContactUpdate extends ContactChanges {
  version: number;
}

export type SortField = 'name' | 'created_at';

export type SortOrder = 'asc' | 'desc';

export interface ContactFilters {
  search: string;
  company: string;
  tagIds: number[];
  sortBy: SortField;
  sortOrder: SortOrder;
  page: number;
  pageSize: number;
}

export type ActivityType = 'CONTACT_UPDATED' | 'TAG_ADDED' | 'TAG_REMOVED';

export interface Activity {
  id: number;
  contact_id: number;
  type: ActivityType;
  details: {
    changes?: Partial<Record<EditableField, { from: string | null; to: string | null }>>;
    tag?: string;
  };
  created_at: string;
}

export interface BulkTagResult {
  tags: Tag[];
  added: number;
  already_tagged: number;
}
