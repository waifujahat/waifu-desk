/** Public GitHub feature API. Internal services are private to this feature. */
export { useGithub } from './hooks/useGithub';
export { getGithubNotice, hasGithubFailure } from './domain/githubStatus';
export { filterRepositories, getRepositoryLanguages } from './domain/repositoryFilters';
export type { RepositorySort, RepositoryFilters } from './domain/repositoryFilters';
