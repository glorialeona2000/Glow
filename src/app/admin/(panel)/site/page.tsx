import { getContent, getGallery } from "@/lib/data";
import { CONTENT_FIELDS } from "@/lib/content";
import { PageTitle } from "@/components/admin/ui";
import { ContentForm, GalleryManager } from "./SiteForms";

export const metadata = { title: "Site" };

export default async function SiteAdminPage() {
  const [content, gallery] = await Promise.all([getContent(), getGallery(false)]);
  const groups = [...new Set(CONTENT_FIELDS.map((f) => f.group))];
  return (
    <>
      <PageTitle title="Contenu du site" sub="Textes, photos, Instagram et informations pratiques. Les modifications sont visibles immédiatement." />
      <div className="space-y-6">
        {groups.map((g) => (
          <ContentForm key={g} group={g} fields={CONTENT_FIELDS.filter((f) => f.group === g)} values={content} />
        ))}
        <GalleryManager items={gallery} />
      </div>
    </>
  );
}
