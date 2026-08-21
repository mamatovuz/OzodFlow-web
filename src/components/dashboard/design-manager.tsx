"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { ThemePicker } from "@/components/dashboard/theme-picker";
import { DesignEditor } from "@/components/dashboard/design-editor";
import { parseDesignConfig, type DesignConfig } from "@/lib/design";

type RestaurantLite = {
  name: string;
  description: string | null;
  logo: string | null;
};

export function DesignManager({
  current,
  canPremium,
  purchased,
  designConfig,
  restaurant,
}: {
  current: string;
  canPremium: boolean;
  purchased: string[];
  designConfig: string;
  restaurant: RestaurantLite;
}) {
  const [config, setConfig] = useState<DesignConfig>(() =>
    parseDesignConfig(designConfig)
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  return (
    <>
      {saved && (
        <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
          <Check className="h-4 w-4" /> Dizayn saqlandi va menyuga qo'llandi.
        </div>
      )}

      <ThemePicker
        current={current}
        canPremium={canPremium}
        purchased={purchased}
        onCustomize={(key) => {
          setSaved(false);
          setEditing(key);
        }}
      />

      {editing && (
        <DesignEditor
          themeKey={editing}
          initialConfig={config}
          restaurant={restaurant}
          onClose={() => setEditing(null)}
          onSaved={(cfg) => {
            setConfig(cfg);
            setEditing(null);
            setSaved(true);
          }}
        />
      )}
    </>
  );
}
