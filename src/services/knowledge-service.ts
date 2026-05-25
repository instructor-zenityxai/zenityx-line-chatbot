import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { Course, CoursesData } from '../types/domain.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');

let cached: CoursesData | null = null;

export function loadCourses(): CoursesData {
  if (cached) return cached;
  const raw = readFileSync(resolve(repoRoot, 'content/courses.json'), 'utf-8');
  cached = JSON.parse(raw) as CoursesData;
  return cached;
}

export function listCourses(): Course[] {
  return loadCourses().courses;
}

export function findCourseById(id: string): Course | undefined {
  return loadCourses().courses.find((c) => c.id === id);
}

export function findCourseByKeyword(text: string): Course | undefined {
  const lower = text.toLowerCase();
  return loadCourses().courses.find(
    (c) =>
      c.title.toLowerCase().includes(lower) ||
      c.tagline.toLowerCase().includes(lower) ||
      c.tags?.some((t) => t.toLowerCase().includes(lower)),
  );
}

export function getCompanyInfo(): CoursesData['company'] {
  return loadCourses().company;
}

export function clearCache(): void {
  cached = null;
}
