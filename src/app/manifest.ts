import type { MetadataRoute } from 'next';
import {
  buildWebAppManifest,
  reportWebAppManifestAnomalies,
} from '@/lib/webAppManifest';

/**
 * Web app manifest for TalentTrust.
 *
 * Provides PWA installability and consistent branding when the app is added to
 * a device home screen.
 *
 * Contract: the manifest content, validation, icon invariants, and diagnostics
 * are owned by `src/lib/webAppManifest.ts`. Keep this route a thin consumer —
 * behavioural changes (icon set, branding, fallbacks) belong in the contract
 * module and must keep `src/lib/webAppManifest.test.ts` and
 * `src/app/__tests__/manifest.test.ts` green.
 *
 * Icon assets (see public/):
 *   - icon.svg         – SVG vector icon (preferred, scales to any size)
 *   - icon-192x192.png – 192×192 PNG placeholder (designer must replace
 *                         with a branded raster)
 *   - icon-512x512.png – 512×512 PNG placeholder (designer must replace
 *                         with a branded raster)
 */
export default function manifest(): MetadataRoute.Manifest {
  const { manifest: webAppManifest, report } = buildWebAppManifest();

  // No-op for the canonical config; guards any future config-driven source
  // from silently shipping a degraded manifest.
  reportWebAppManifestAnomalies(report);

  return webAppManifest;
}
