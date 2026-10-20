export const endpoints = {
  contacts: () => '/contacts',
  contact: (contactId: number) => `/contacts/${contactId}`,
  contactTags: (contactId: number) => `/contacts/${contactId}/tags`,
  contactTag: (contactId: number, tagId: number) => `/contacts/${contactId}/tags/${tagId}`,
  contactActivities: (contactId: number) => `/contacts/${contactId}/activities`,
  bulkTags: () => '/contacts/bulk/tags',
  tags: () => '/tags',
};
