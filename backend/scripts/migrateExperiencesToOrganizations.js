import "dotenv/config";
import connectDB from "../config/db.js";
import Experience from "../models/Experience.js";
import {
  parseLooseDate,
  slugifyOrgKey
} from "../utils/experienceTimeline.js";

const isLegacyDocument = (doc) =>
  Boolean(doc.role) && (!Array.isArray(doc.roles) || doc.roles.length === 0);

const groupKey = (doc) =>
  slugifyOrgKey(doc.orgKey || doc.organization || doc.company) || "organization";

const toRole = (doc, index) => ({
  role: doc.role,
  startDate: doc.startDate || "Unknown",
  endDate: doc.endDate || "",
  description: doc.description || "",
  technologies: Array.isArray(doc.technologies) ? doc.technologies : [],
  promotionLabel: doc.isPromotion || index > 0 ? "PROMOTED" : "",
  order: Number.isFinite(Number(doc.sortOrder)) ? Number(doc.sortOrder) : index
});

const migrate = async () => {
  await connectDB();

  const docs = await Experience.find().lean();
  const alreadyMigrated = docs.filter(
    (doc) => Array.isArray(doc.roles) && doc.roles.length && doc.organization
  );
  const legacy = docs.filter(isLegacyDocument);

  if (!legacy.length) {
    console.log(
      `Experience migration skipped. ${alreadyMigrated.length} organization document(s) already in place.`
    );
    process.exit(0);
  }

  const groups = new Map();

  legacy.forEach((doc) => {
    const key = groupKey(doc);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(doc);
  });

  let created = 0;
  let removed = 0;

  for (const [, members] of groups) {
    const ordered = [...members].sort(
      (a, b) =>
        parseLooseDate(a.startDate).getTime() -
        parseLooseDate(b.startDate).getTime()
    );

    const canonical = ordered.reduce((best, item) =>
      (item.company || "").length > (best.company || "").length ? item : best
    , ordered[0]);

    await Experience.create({
      organization: canonical.company || canonical.organization,
      companyLogo: ordered.find((item) => item.companyLogo)?.companyLogo || "",
      organizationMeta: {
        industry: "",
        location: "",
        website: ""
      },
      roles: ordered.map((item, index) => toRole(item, index)),
      order: created,
      isVisible: true,
      migratedFrom: ordered.map((item) => String(item._id))
    });

    created += 1;

    const ids = ordered.map((item) => item._id);
    const result = await Experience.deleteMany({ _id: { $in: ids } });
    removed += result.deletedCount || 0;
  }

  console.log(
    `Experience migration complete. Created ${created} organization(s) from ${legacy.length} legacy role(s). Removed ${removed} legacy document(s).`
  );
  process.exit(0);
};

migrate().catch((error) => {
  console.error("Experience migration failed:", error);
  process.exit(1);
});
