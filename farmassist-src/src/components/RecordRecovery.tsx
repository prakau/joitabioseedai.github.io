import { useEffect, useState } from "react";
import {
  Archive,
  Download,
  HardDrive,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useInterface } from "../lib/interface";
import { downloadJson } from "../lib/storage";
import {
  captureBackup,
  MAX_BACKUP_BYTES,
  mergeBackups,
  parseBackup,
  restoreBackup,
  rawRecoveryFile,
  type Backup,
} from "../lib/record-backup";
import {
  deleteCheckpoint,
  listCheckpoints,
  saveCheckpoints,
  type Checkpoint,
} from "../lib/recovery-store";
import { Button } from "./ui/button";
import { Field, Notice } from "./workspace";

const reasons: Record<string, [string, string]> = {
  size: [
    "Backup is too large. The maximum file size is 5 MB.",
    "बैकअप बहुत बड़ा है। अधिकतम फ़ाइल आकार 5 MB है।",
  ],
  format: [
    "This is not a valid JOITAFA record backup.",
    "यह मान्य JOITAFA रिकॉर्ड बैकअप नहीं है।",
  ],
  version: [
    "Unsupported backup version. Use a version 3 or 4 JOITAFA export.",
    "यह बैकअप संस्करण समर्थित नहीं है। JOITAFA संस्करण 3 या 4 का निर्यात चुनें।",
  ],
  unknown: [
    "The file includes an unsupported storage collection. Nothing was imported.",
    "फ़ाइल में असमर्थित रिकॉर्ड हैं। कुछ भी आयात नहीं हुआ।",
  ],
  records: [
    "The backup contains invalid records or units. Nothing was imported.",
    "बैकअप में अमान्य रिकॉर्ड या इकाइयां हैं। कुछ भी आयात नहीं हुआ।",
  ],
  duplicate: [
    "The file repeats a record ID. Resolve duplicates in the original app before exporting again.",
    "फ़ाइल में एक रिकॉर्ड ID दोहराई गई है। मूल ऐप में जांचकर फिर निर्यात करें।",
  ],
  current: [
    "Some device records cannot be safely read. No records were changed. Contact support before clearing data.",
    "डिवाइस के कुछ रिकॉर्ड सुरक्षित रूप से पढ़े नहीं जा सके। कोई रिकॉर्ड नहीं बदला। डेटा मिटाने से पहले सहायता लें।",
  ],
  changed: [
    "Records changed after the preview. Preview the backup again before restoring.",
    "पूर्वावलोकन के बाद रिकॉर्ड बदल गए। बहाल करने से पहले बैकअप फिर जांचें।",
  ],
  quota: [
    "Device storage could not save the restore. Previous records were kept; the recovery checkpoint is also available below.",
    "डिवाइस में बहाली सहेजी नहीं जा सकी। पुराने रिकॉर्ड रखे गए हैं; नीचे रिकवरी प्रति भी उपलब्ध है।",
  ],
  recovery: [
    "Restore was interrupted and rollback was incomplete. Do not clear data. Download both recovery checkpoints below and contact support.",
    "बहाली रुक गई और पुराने रिकॉर्ड पूरी तरह वापस नहीं रखे जा सके। डेटा न मिटाएं। नीचे दोनों रिकवरी प्रतियां डाउनलोड करके सहायता लें।",
  ],
  checkpoint: [
    "Device recovery storage is unavailable or full. No restore was started. Download a file backup and check browser storage permissions.",
    "डिवाइस रिकवरी स्टोरेज बंद या भरा है। बहाली शुरू नहीं हुई। फ़ाइल बैकअप डाउनलोड करें और ब्राउज़र की अनुमति जांचें।",
  ],
  limit: [
    "The merged records exceed this tool's storage limit. Export and review older records before importing; nothing was discarded.",
    "मिलाए हुए रिकॉर्ड इस उपकरण की सीमा से अधिक हैं। पुराने रिकॉर्ड निर्यात और जांचें; कुछ भी हटाया नहीं गया।",
  ],
};
export function RecordRecovery() {
  const { language } = useInterface();
  const l = (en: string, hi: string) => (language === "hi" ? hi : en);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [preview, setPreview] = useState<{
    incoming: Backup;
    current: Backup;
    name: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [checkpointAvailable, setCheckpointAvailable] = useState<
    boolean | null
  >(null);
  const explain = (failure: unknown) => {
    const pair =
      reasons[failure instanceof Error ? failure.message : ""] ||
      reasons.format;
    setError(l(...pair));
  };
  async function refresh() {
    try {
      setCheckpoints(await listCheckpoints());
      setCheckpointAvailable(true);
    } catch {
      setCheckpointAvailable(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  function prepare(incoming: Backup, name: string) {
    const current = captureBackup(localStorage);
    mergeBackups(current, incoming);
    setPreview({ incoming, current, name });
    setAcknowledged(false);
  }
  const summary = preview
    ? mergeBackups(preview.current, preview.incoming)
    : null;
  return (
    <section
      className="section-divider recovery-panel"
      aria-labelledby="recovery-heading"
    >
      <div className="section-row">
        <h3 id="recovery-heading">
          {l("Backups & recovery", "बैकअप और रिकवरी")}
        </h3>
        <HardDrive size={22} aria-hidden />
      </div>
      <Notice>
        {l(
          "Device-local records. Cloud record sync is not connected. A connected AI backend does not mean your records are backed up online.",
          "रिकॉर्ड केवल इस डिवाइस पर हैं। क्लाउड रिकॉर्ड सिंक नहीं जुड़ा है। AI सर्वर से जुड़ने का अर्थ ऑनलाइन बैकअप होना नहीं है।",
        )}
      </Notice>
      <p className="muted">
        {l(
          "Backups include farm records, not photos, audio, profile settings or API caches. Files and device checkpoints are not encrypted by this app. Keep them private. Clearing site data or uninstalling can also remove device checkpoints.",
          "बैकअप में खेती के रिकॉर्ड हैं, फोटो, ऑडियो, प्रोफ़ाइल सेटिंग या API कैश नहीं। फ़ाइलें और डिवाइस प्रतियां ऐप द्वारा एन्क्रिप्ट नहीं हैं। इन्हें निजी रखें। साइट डेटा मिटाने या ऐप हटाने पर डिवाइस प्रतियां भी हट सकती हैं।",
        )}
      </p>
      <div className="actions">
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => {
            setError("");
            setMessage("");
            try {
              downloadJson(
                "joitafa-records-v4.json",
                captureBackup(localStorage),
              );
            } catch (failure) {
              explain(failure);
            }
          }}
        >
          <Download size={18} />
          {l("Export all farm records", "सभी खेती रिकॉर्ड निर्यात करें")}
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            setMessage("");
            try {
              await saveCheckpoints([
                { backup: captureBackup(localStorage), reason: "manual" },
              ]);
              await refresh();
              setMessage(
                l(
                  "Recovery copy saved on this device, not in the cloud.",
                  "रिकवरी प्रति इस डिवाइस पर सहेजी गई है, क्लाउड में नहीं।",
                ),
              );
            } catch (failure) {
              explain(failure);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Archive size={18} />
          {l("Save device checkpoint", "डिवाइस रिकवरी प्रति सहेजें")}
        </Button>
      </div>
      <Field label={l("Restore a JOITAFA backup", "JOITAFA बैकअप बहाल करें")}>
        <input
          type="file"
          accept=".json,application/json"
          disabled={busy}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setError("");
            setMessage("");
            setPreview(null);
            setBusy(true);
            try {
              if (file.size > MAX_BACKUP_BYTES) throw new Error("size");
              prepare(parseBackup(await file.text()), file.name);
            } catch (failure) {
              explain(failure);
            } finally {
              setBusy(false);
            }
          }}
        />
      </Field>
      {preview && summary && (
        <div className="restore-preview">
          <h4>{l("Restore preview", "बहाली का पूर्वावलोकन")}</h4>
          <p>{preview.name}</p>
          <dl className="recovery-counts">
            <div>
              <dt>{l("New records", "नए रिकॉर्ड")}</dt>
              <dd>{summary.added}</dd>
            </div>
            <div>
              <dt>{l("Already present", "पहले से मौजूद")}</dt>
              <dd>{summary.duplicates}</dd>
            </div>
            <div>
              <dt>
                {l(
                  "Conflicts: keep device version",
                  "मतभेद: डिवाइस संस्करण रखें",
                )}
              </dt>
              <dd>{summary.conflicts}</dd>
            </div>
          </dl>
          {summary.conflicts > 0 && (
            <Notice>
              {l(
                "Existing records with the same ID but different contents will not be overwritten. Keep the original backup file for comparison. Conflicting collections:",
                "एक ही ID के अलग रिकॉर्ड अधिलेखित नहीं होंगे। तुलना के लिए मूल बैकअप फ़ाइल रखें। मतभेद वाले समूह:",
              )}{" "}
              {summary.conflictCollections.join(", ")}
            </Notice>
          )}
          <label className="check-label">
            <input
              type="checkbox"
              disabled={busy}
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
            />
            <span>
              {l(
                "Merge new records only. Keep existing versions of conflicts. Save recovery copies first.",
                "केवल नए रिकॉर्ड मिलाएं। मतभेद में मौजूदा संस्करण रखें। पहले रिकवरी प्रतियां सहेजें।",
              )}
            </span>
          </label>
          <div className="actions">
            <Button
              disabled={busy || !acknowledged || !summary.added}
              onClick={async () => {
                setBusy(true);
                setError("");
                setMessage("");
                try {
                  await saveCheckpoints([
                    { backup: preview.current, reason: "before-restore" },
                    { backup: preview.incoming, reason: "import" },
                  ]);
                  const result = restoreBackup(
                    localStorage,
                    preview.incoming,
                    preview.current.records,
                  );
                  window.dispatchEvent(new CustomEvent("records-changed"));
                  setMessage(
                    l(
                      `${result.added} records restored on this device. ${result.conflicts} conflicts kept their existing version.`,
                      `इस डिवाइस पर ${result.added} रिकॉर्ड बहाल हुए। ${result.conflicts} मतभेदों में मौजूदा संस्करण रखा गया।`,
                    ),
                  );
                  setPreview(null);
                } catch (failure) {
                  explain(failure);
                } finally {
                  await refresh();
                  setBusy(false);
                }
              }}
            >
              <Upload size={18} />
              {l("Merge backup", "बैकअप मिलाएं")}
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => setPreview(null)}
            >
              <X size={18} />
              {l("Cancel", "रद्द करें")}
            </Button>
          </div>
        </div>
      )}
      {error && <Notice error>{error}</Notice>}
      {error === l(...reasons.current) && (
        <Button
          variant="secondary"
          onClick={() => {
            try {
              downloadJson(
                "joitafa-raw-recovery.json",
                rawRecoveryFile(localStorage),
              );
            } catch {
              setError(
                l(
                  "Device storage could not be read. Contact support before clearing data.",
                  "डिवाइस स्टोरेज पढ़ा नहीं जा सका। डेटा मिटाने से पहले सहायता लें।",
                ),
              );
            }
          }}
        >
          <Download size={18} />
          {l(
            "Export raw recovery file for review",
            "जांच के लिए मूल रिकवरी फ़ाइल निर्यात करें",
          )}
        </Button>
      )}
      {message && <Notice>{message}</Notice>}
      <h4>{l("Device recovery copies", "डिवाइस रिकवरी प्रतियां")}</h4>
      {checkpointAvailable === false && (
        <p>
          {l(
            "IndexedDB recovery storage is unavailable. File exports are still available.",
            "IndexedDB रिकवरी स्टोरेज उपलब्ध नहीं है। फ़ाइल निर्यात उपलब्ध है।",
          )}
        </p>
      )}
      {checkpointAvailable && !checkpoints.length && (
        <p className="muted">
          {l(
            "No device checkpoints yet.",
            "अभी कोई डिवाइस रिकवरी प्रति नहीं है।",
          )}
        </p>
      )}
      {checkpoints.map((item) => (
        <div className="saved-row" key={item.id}>
          <span>
            {l(
              item.reason === "manual"
                ? "Manual checkpoint"
                : item.reason === "import"
                  ? "Imported backup"
                  : "Before restore",
              item.reason === "manual"
                ? "सहेजी गई प्रति"
                : item.reason === "import"
                  ? "आयातित बैकअप"
                  : "बहाली से पहले",
            )}
            <small>
              {new Date(item.createdAt).toLocaleString(
                language === "hi" ? "hi-IN" : "en-IN",
              )}
            </small>
          </span>
          <div className="actions">
            <Button
              variant="ghost"
              disabled={busy}
              title={l("Preview recovery", "रिकवरी पूर्वावलोकन")}
              aria-label={l("Preview recovery", "रिकवरी पूर्वावलोकन")}
              onClick={() => {
                setError("");
                setMessage("");
                try {
                  prepare(
                    parseBackup(JSON.stringify(item.backup)),
                    "Device checkpoint",
                  );
                } catch (failure) {
                  explain(failure);
                }
              }}
            >
              <RotateCcw size={18} />
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              title={l("Download checkpoint", "रिकवरी प्रति डाउनलोड करें")}
              aria-label={l("Download checkpoint", "रिकवरी प्रति डाउनलोड करें")}
              onClick={() =>
                downloadJson(`joitafa-recovery-${item.id}.json`, item.backup)
              }
            >
              <Download size={18} />
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              title={l("Delete checkpoint", "रिकवरी प्रति हटाएं")}
              aria-label={l("Delete checkpoint", "रिकवरी प्रति हटाएं")}
              onClick={async () => {
                if (
                  !window.confirm(
                    l(
                      "Delete this recovery copy? Current farm records will not change.",
                      "यह रिकवरी प्रति हटाएं? मौजूदा खेती के रिकॉर्ड नहीं बदलेंगे।",
                    ),
                  )
                )
                  return;
                setBusy(true);
                setError("");
                try {
                  await deleteCheckpoint(item.id);
                  await refresh();
                } catch (failure) {
                  explain(failure);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Trash2 size={18} />
            </Button>
          </div>
        </div>
      ))}
    </section>
  );
}
