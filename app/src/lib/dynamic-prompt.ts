/**
 * Builds a dynamic system prompt by replacing the static mock entity table
 * with real entity data discovered from the user's Home Assistant installation.
 */

interface HAEntitySnapshot {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

interface HAArea {
  area_id: string;
  name: string;
}

/**
 * Maps a HA domain to the recommended component.
 */
const domainToComponent: Record<string, string> = {
  weather: "WeatherCard",
  light: "LightCard",
  switch: "SwitchCard",
  climate: "ClimateCard",
  media_player: "MediaCard",
  sensor: "SensorCard",
  cover: "CoverCard",
  scene: "SceneCard",
  camera: "CameraCard",
  binary_sensor: "BinarySensorCard",
};

/**
 * Build a human-readable description from an entity snapshot.
 */
function describeEntity(e: HAEntitySnapshot): string {
  const name =
    (e.attributes.friendly_name as string) || e.entity_id.split(".")[1];
  const domain = e.entity_id.split(".")[0];
  const unit = (e.attributes.unit_of_measurement as string) || "";
  const deviceClass = (e.attributes.device_class as string) || "";

  let desc = name;

  switch (domain) {
    case "light":
      desc += e.state === "on" ? " — on" : " — off";
      if (e.attributes.brightness)
        desc += `, ${Math.round(((e.attributes.brightness as number) / 255) * 100)}%`;
      break;
    case "switch":
    case "input_boolean":
      desc += e.state === "on" ? " — on" : " — off";
      break;
    case "sensor":
      desc += ` — ${e.state}${unit ? " " + unit : ""}`;
      break;
    case "binary_sensor":
      desc += ` (${deviceClass || "generic"}) — ${e.state}`;
      break;
    case "climate":
      desc += ` — ${e.state}`;
      if (e.attributes.current_temperature)
        desc += `, current ${e.attributes.current_temperature}°`;
      if (e.attributes.temperature)
        desc += `, target ${e.attributes.temperature}°`;
      break;
    case "media_player":
      desc += ` — ${e.state}`;
      if (e.attributes.media_title) desc += `: "${e.attributes.media_title}"`;
      break;
    case "camera":
      desc += ` — ${e.state}`;
      break;
    case "weather":
      desc += ` — ${e.state}`;
      if (e.attributes.temperature)
        desc += `, ${e.attributes.temperature}°`;
      break;
    case "cover":
      desc += ` — ${e.state}`;
      if (e.attributes.current_position != null)
        desc += `, ${e.attributes.current_position}% open`;
      break;
    case "scene":
      desc += " scene";
      break;
    default:
      desc += ` — ${e.state}`;
  }

  return desc;
}

/**
 * Build the dynamic system prompt by replacing the mock entity table section
 * with real entities from the user's HA installation.
 */
export function buildDynamicPrompt(
  basePrompt: string,
  entities: HAEntitySnapshot[],
  areas: HAArea[]
): string {
  // Build entity table
  const supportedDomains = new Set(Object.keys(domainToComponent));

  // Group entities by domain for organised presentation
  const byDomain = new Map<string, HAEntitySnapshot[]>();
  for (const e of entities) {
    const domain = e.entity_id.split(".")[0];
    if (!supportedDomains.has(domain)) continue;
    if (!byDomain.has(domain)) byDomain.set(domain, []);
    byDomain.get(domain)!.push(e);
  }

  // Build the entity table rows
  const rows: string[] = [];
  for (const [domain, domainEntities] of byDomain) {
    const component = domainToComponent[domain] || "—";
    for (const e of domainEntities) {
      rows.push(
        `| ${e.entity_id} | ${domain} | ${component} | ${describeEntity(e)} |`
      );
    }
  }

  const entityTable = `## Real Home Assistant Entities

These entities come from the user's actual HA installation. Use these entity IDs (not the generic mock ones) when building the dashboard.

| Entity ID | Domain | Component | Description |
|-----------|--------|-----------|-------------|
${rows.join("\n")}`;

  // Build areas section if available
  let areasSection = "";
  if (areas.length > 0) {
    areasSection = `\n\n## Areas\n\nThe user's home has these areas: ${areas.map((a) => a.name).join(", ")}. Group dashboard cards by area when it makes sense.\n`;
  }

  // Replace the static mock entity section
  const mockSectionStart = "## Mock Entities Available for Preview";
  const mockSectionEnd = "## Additional Hooks";

  const startIdx = basePrompt.indexOf(mockSectionStart);
  const endIdx = basePrompt.indexOf(mockSectionEnd);

  if (startIdx !== -1 && endIdx !== -1) {
    return (
      basePrompt.substring(0, startIdx) +
      entityTable +
      areasSection +
      "\n\n" +
      basePrompt.substring(endIdx)
    );
  }

  // Fallback: append the entity table to the end
  return basePrompt + "\n\n" + entityTable + areasSection;
}
