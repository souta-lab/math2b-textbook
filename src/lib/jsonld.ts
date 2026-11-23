export const SITE_ORIGIN = 'https://s0u7a.f5.si';

export interface CrumbLike {
  label: string;
  href?: string;
}

export function absUrl(path: string): string {
  const normalized = path.endsWith('/') ? path : `${path}/`;
  return SITE_ORIGIN + (normalized.startsWith('/') ? normalized : `/${normalized}`);
}

export function breadcrumbJsonLd(crumbs: CrumbLike[], selfUrl: string) {
  const trail: CrumbLike[] = [{ label: 'ホーム', href: import.meta.env.BASE_URL }, ...crumbs];
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.label,
      item:
        index === trail.length - 1
          ? selfUrl
          : crumb.href
            ? absUrl(crumb.href)
            : selfUrl,
    })),
  };
}

export function learningResourceJsonLd(name: string, description: string, selfUrl: string) {
  return {
    '@type': 'LearningResource',
    name,
    description,
    url: selfUrl,
    inLanguage: 'ja',
    learningResourceType: '教材',
    educationalLevel: '高校',
    isPartOf: {
      '@type': 'Course',
      name: '高校数学 読解教材',
      url: absUrl(import.meta.env.BASE_URL),
    },
  };
}
