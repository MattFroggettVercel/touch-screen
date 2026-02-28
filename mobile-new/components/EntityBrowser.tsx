/**
 * Entity Browser Modal
 *
 * Displays the HA entity catalog fetched from the device agent's
 * /api/ha/catalog REST endpoint. Grouped by domain with collapsible
 * sections, search filtering, and area/component metadata.
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SectionList,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { DeviceClient, CatalogData, CatalogEntity } from "@/lib/device-client";
import { COLORS } from "@/lib/constants";

const DOMAIN_LABELS: Record<string, string> = {
  light: "Lights",
  switch: "Switches",
  climate: "Climate",
  media_player: "Media Players",
  sensor: "Sensors",
  binary_sensor: "Binary Sensors",
  cover: "Covers",
  camera: "Cameras",
  scene: "Scenes",
  weather: "Weather",
};

const DOMAIN_ICONS: Record<string, string> = {
  light: "💡",
  switch: "🔌",
  climate: "🌡️",
  media_player: "🎵",
  sensor: "📊",
  binary_sensor: "🔘",
  cover: "🪟",
  camera: "📹",
  scene: "🎬",
  weather: "🌤",
};

interface EntityBrowserProps {
  client: DeviceClient | null;
  visible: boolean;
  onClose: () => void;
}

interface SectionData {
  title: string;
  domain: string;
  icon: string;
  component: string;
  data: CatalogEntity[];
  count: number;
}

export default function EntityBrowser({
  client,
  visible,
  onClose,
}: EntityBrowserProps) {
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(
    new Set()
  );

  // Fetch catalog when modal becomes visible
  useEffect(() => {
    if (!visible || !client) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    client
      .getCatalog()
      .then((data) => {
        if (!cancelled) {
          setCatalog(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Failed to load entities");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [visible, client]);

  // Reset search when modal closes
  useEffect(() => {
    if (!visible) {
      setSearch("");
    }
  }, [visible]);

  const toggleDomain = useCallback((domain: string) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  }, []);

  // Build sections from catalog, applying search filter
  const { sections, totalCount } = useMemo(() => {
    if (!catalog) return { sections: [], totalCount: 0 };

    const query = search.toLowerCase().trim();
    let total = 0;
    const result: SectionData[] = [];

    for (const [domain, entities] of Object.entries(catalog.entities)) {
      const filtered = query
        ? entities.filter(
            (e) =>
              e.name.toLowerCase().includes(query) ||
              e.id.toLowerCase().includes(query) ||
              (e.area && e.area.toLowerCase().includes(query))
          )
        : entities;

      if (filtered.length === 0) continue;

      total += filtered.length;
      const isExpanded = expandedDomains.has(domain);

      result.push({
        title: DOMAIN_LABELS[domain] || domain,
        domain,
        icon: DOMAIN_ICONS[domain] || "📦",
        component: catalog.componentMap[domain] || "",
        data: isExpanded ? filtered : [],
        count: filtered.length,
      });
    }

    // Sort by domain label
    result.sort((a, b) => a.title.localeCompare(b.title));

    return { sections: result, totalCount: total };
  }, [catalog, search, expandedDomains]);

  const renderEntity = useCallback(
    ({ item }: { item: CatalogEntity }) => (
      <View style={styles.entityRow}>
        <View style={styles.entityInfo}>
          <Text style={styles.entityName}>{item.name}</Text>
          <Text style={styles.entityId}>{item.id}</Text>
          {/* Sensor metadata */}
          {(item.class || item.unit) && (
            <Text style={styles.entityMeta}>
              {[item.class, item.unit].filter(Boolean).join(" · ")}
            </Text>
          )}
        </View>
        <View style={styles.entityTags}>
          {item.area && (
            <View style={styles.areaTag}>
              <Text style={styles.areaTagText}>{item.area}</Text>
            </View>
          )}
        </View>
      </View>
    ),
    []
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionData }) => {
      const isExpanded = expandedDomains.has(section.domain);
      return (
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleDomain(section.domain)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionLeft}>
            <Text style={styles.sectionIcon}>{section.icon}</Text>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
          <View style={styles.sectionRight}>
            <View style={styles.componentBadge}>
              <Text style={styles.componentBadgeText}>
                {section.component}
              </Text>
            </View>
            <Text style={styles.sectionCount}>
              {section.count} {isExpanded ? "▼" : "▶"}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [expandedDomains, toggleDomain]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>HA Entities</Text>
            {catalog && (
              <Text style={styles.headerSubtitle}>
                {totalCount} entities · {catalog.areas.length} areas
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search entities, areas..."
            placeholderTextColor={COLORS.textDim}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading entities...</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Could not load entities</Text>
            <Text style={styles.errorDetail}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                if (!client) return;
                setLoading(true);
                setError(null);
                client
                  .getCatalog()
                  .then(setCatalog)
                  .catch((err) => setError(err.message))
                  .finally(() => setLoading(false));
              }}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : sections.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>
              {search
                ? "No entities match your search"
                : "No supported entities found"}
            </Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={renderEntity}
            renderSectionHeader={renderSectionHeader as any}
            stickySectionHeadersEnabled
            style={styles.list}
            contentContainerStyle={styles.listContent}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 12,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    gap: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.accent,
  },

  // Search
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // List
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 32,
  },

  // Section headers
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionIcon: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  sectionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  componentBadge: {
    backgroundColor: "rgba(201, 169, 98, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(201, 169, 98, 0.2)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  componentBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.accent,
  },
  sectionCount: {
    fontSize: 13,
    color: COLORS.textMuted,
    minWidth: 30,
    textAlign: "right",
  },

  // Entity rows
  entityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingLeft: 44,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  entityInfo: {
    flex: 1,
    marginRight: 10,
  },
  entityName: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "500",
    marginBottom: 1,
  },
  entityId: {
    fontSize: 11,
    color: COLORS.textDim,
  },
  entityMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  entityTags: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  areaTag: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  areaTagText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },

  // Loading / error / empty
  loadingText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  errorIcon: {
    fontSize: 32,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  errorDetail: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
  },
});
