import { Archive, ArrowUpRight, FolderGit2, GitFork, Star } from 'lucide-react';
import type { GitHubRepo } from '../../../types';
import { ExternalLink } from '../../../components/Display';
import { compact, relative } from '../../../lib/format';
import { openTrusted } from '../../../lib/desktop';

interface RepositoryCardProps {
  repo: GitHubRepo;
}

export function RepositoryCard({ repo }: RepositoryCardProps) {
  return (
    <article className="repo-card">
      <div className="repo-top">
        <span className="repo-symbol">
          <FolderGit2 size={21} />
        </span>

        {(repo.archived || repo.fork) && (
          <span className="repo-flags">
            {repo.archived ? (
              <>
                <Archive size={13} /> Arsip
              </>
            ) : (
              'Fork'
            )}
          </span>
        )}
      </div>

      <div className="repo-title">
        <ExternalLink url={repo.html_url}>{repo.name}</ExternalLink>
      </div>

      {repo.description && <p>{repo.description}</p>}

      {repo.topics?.length > 0 && (
        <div className="repo-topics">
          {repo.topics.slice(0, 3).map((topic) => (
            <span key={topic}>{topic}</span>
          ))}
        </div>
      )}

      <div className="repo-bottom">
        <span className="repo-lang">{repo.language || '—'}</span>

        <span>
          <Star size={14} /> {compact(repo.stargazers_count)}
        </span>

        <span>
          <GitFork size={14} /> {compact(repo.forks_count)}
        </span>

        <span className="repo-date">{relative(repo.pushed_at || repo.updated_at)}</span>

        <button
          type="button"
          className="repo-link"
          onClick={() => void openTrusted(repo.html_url)}
          aria-label={`Buka ${repo.name}`}
        >
          <ArrowUpRight size={17} />
        </button>
      </div>
    </article>
  );
}
