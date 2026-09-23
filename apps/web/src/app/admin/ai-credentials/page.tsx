"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  PlugZap,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type {
  AiCredentialDto,
  AiProvider,
  CreateAiCredentialDto,
} from "@repo/contracts";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Header } from "../../../components/research/header";
import { Footer } from "../../../components/research/footer";
import { aiCredentialsApi } from "../../../lib/ai-credentials-api";

const PROVIDERS: Array<{ value: AiProvider; label: string; model: string }> = [
  { value: "OPENAI", label: "OpenAI", model: "gpt-4.1-mini" },
  { value: "GEMINI", label: "Google Gemini", model: "gemini-2.5-flash" },
  { value: "OPENAI_COMPATIBLE", label: "OpenAI-compatible", model: "" },
];

const EMPTY_FORM: CreateAiCredentialDto = {
  name: "",
  provider: "OPENAI",
  apiKey: "",
  defaultModel: "gpt-4.1-mini",
  baseUrl: "",
  isActive: true,
  isDefault: false,
};

export default function AiCredentialsPage(): React.JSX.Element {
  const [token, setToken] = useState("");
  const [credentials, setCredentials] = useState<AiCredentialDto[]>([]);
  const [form, setForm] = useState<CreateAiCredentialDto>(EMPTY_FORM);
  const [busy, setBusy] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    setToken(sessionStorage.getItem("ai-admin-token") || "");
  }, []);

  const load = async (adminToken = token): Promise<void> => {
    setBusy("load");
    setError("");
    try {
      const items = await aiCredentialsApi.list(adminToken);
      sessionStorage.setItem("ai-admin-token", adminToken);
      setCredentials(items);
      setAuthorized(true);
    } catch (reason: unknown) {
      setAuthorized(false);
      setError(
        reason instanceof Error ? reason.message : "Could not load credentials",
      );
    } finally {
      setBusy(null);
    }
  };

  const refreshItem = (updated: AiCredentialDto): void => {
    setCredentials((current) =>
      current.map((item) =>
        item.id === updated.id
          ? updated
          : updated.isDefault
            ? { ...item, isDefault: false }
            : item,
      ),
    );
  };

  const createCredential = async (): Promise<void> => {
    setBusy("create");
    setError("");
    try {
      const created = await aiCredentialsApi.create(token, form);
      setCredentials((current) => [
        created,
        ...current.map((item) =>
          created.isDefault ? { ...item, isDefault: false } : item,
        ),
      ]);
      setForm(EMPTY_FORM);
    } catch (reason: unknown) {
      setError(
        reason instanceof Error ? reason.message : "Could not save credential",
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="portal">
      <Header />
      <main id="main-content" className="portal-container ai-admin-page">
        <header className="ai-admin-heading">
          <span className="eyebrow">Administration</span>
          <h1>AI provider credentials</h1>
          <p>
            Configure the providers available to the research assistant. Secret
            keys are encrypted and never returned to this page.
          </p>
        </header>

        {!authorized ? (
          <section className="ai-admin-auth">
            <ShieldCheck aria-hidden="true" />
            <div>
              <h2>Unlock credential management</h2>
              <p>
                Enter the server-side AI administration token for this session.
              </p>
            </div>
            <Input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Administration token"
            />
            <Button
              onClick={() => void load()}
              disabled={!token || busy === "load"}
            >
              {busy === "load" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <KeyRound />
              )}{" "}
              Unlock
            </Button>
          </section>
        ) : (
          <div className="ai-admin-layout">
            <section className="ai-credential-form">
              <div>
                <span className="eyebrow">New connection</span>
                <h2>Add provider</h2>
              </div>
              <label>
                Name
                <Input
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="Production OpenAI"
                />
              </label>
              <label>
                Provider
                <select
                  value={form.provider}
                  onChange={(event) => {
                    const provider = event.target.value as AiProvider;
                    setForm({
                      ...form,
                      provider,
                      defaultModel:
                        PROVIDERS.find((item) => item.value === provider)
                          ?.model || "",
                    });
                  }}
                >
                  {PROVIDERS.map((provider) => (
                    <option key={provider.value} value={provider.value}>
                      {provider.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                API key
                <Input
                  type="password"
                  value={form.apiKey}
                  onChange={(event) =>
                    setForm({ ...form, apiKey: event.target.value })
                  }
                  autoComplete="new-password"
                />
              </label>
              <label>
                Default model
                <Input
                  value={form.defaultModel}
                  onChange={(event) =>
                    setForm({ ...form, defaultModel: event.target.value })
                  }
                  placeholder="Model ID"
                />
              </label>
              <label>
                Base URL <small>optional</small>
                <Input
                  value={form.baseUrl || ""}
                  onChange={(event) =>
                    setForm({ ...form, baseUrl: event.target.value })
                  }
                  placeholder="https://…/v1"
                />
              </label>
              <label className="ai-checkbox">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(event) =>
                    setForm({ ...form, isDefault: event.target.checked })
                  }
                />{" "}
                Use as default chat provider
              </label>
              <Button
                className="ai-save-credential"
                onClick={() => void createCredential()}
                disabled={
                  !form.name ||
                  !form.apiKey ||
                  !form.defaultModel ||
                  busy === "create"
                }
              >
                {busy === "create" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <PlugZap />
                )}{" "}
                Save provider
              </Button>
            </section>

            <section className="ai-credential-list">
              <div className="ai-credential-list-heading">
                <div>
                  <span className="eyebrow">Provider registry</span>
                  <h2>Configured connections</h2>
                </div>
                <span>{credentials.length} total</span>
              </div>
              {credentials.length === 0 ? (
                <div className="ai-credential-empty">
                  No provider credentials configured yet.
                </div>
              ) : (
                credentials.map((credential) => (
                  <article key={credential.id} className="ai-credential-card">
                    <div className="ai-provider-mark">
                      {credential.provider === "GEMINI"
                        ? "G"
                        : credential.provider === "OPENAI"
                          ? "O"
                          : "API"}
                    </div>
                    <div className="ai-credential-info">
                      <div>
                        <h3>{credential.name}</h3>
                        {credential.isDefault && (
                          <span className="ai-default-badge">Default</span>
                        )}
                      </div>
                      <p>
                        {credential.provider.replace("_", " ")} ·{" "}
                        {credential.defaultModel}
                      </p>
                      <small>
                        {credential.keyHint}
                        {credential.lastTestedAt
                          ? ` · tested ${new Date(credential.lastTestedAt).toLocaleString()}`
                          : " · not tested"}
                      </small>
                      {credential.lastError && <em>{credential.lastError}</em>}
                    </div>
                    <div className="ai-credential-status">
                      <span
                        className={`is-${credential.lastTestStatus || "untested"}`}
                      />
                      {credential.isActive ? "Active" : "Disabled"}
                    </div>
                    <div className="ai-credential-actions">
                      <Button
                        variant="outline"
                        onClick={async () => {
                          setBusy(`test-${credential.id}`);
                          try {
                            refreshItem(
                              await aiCredentialsApi.test(token, credential.id),
                            );
                          } catch (reason) {
                            setError(
                              reason instanceof Error
                                ? reason.message
                                : "Test failed",
                            );
                          } finally {
                            setBusy(null);
                          }
                        }}
                      >
                        {busy === `test-${credential.id}` ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <CheckCircle2 />
                        )}{" "}
                        Test
                      </Button>
                      {!credential.isDefault && (
                        <Button
                          variant="outline"
                          onClick={async () =>
                            refreshItem(
                              await aiCredentialsApi.update(
                                token,
                                credential.id,
                                { isDefault: true, isActive: true },
                              ),
                            )
                          }
                        >
                          Set default
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        onClick={async () =>
                          refreshItem(
                            await aiCredentialsApi.update(
                              token,
                              credential.id,
                              { isActive: !credential.isActive },
                            ),
                          )
                        }
                      >
                        {credential.isActive ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        variant="ghost"
                        className="ai-delete-credential"
                        aria-label={
                          pendingDeleteId === credential.id
                            ? `Confirm deleting ${credential.name}`
                            : `Delete ${credential.name}`
                        }
                        onBlur={() => setPendingDeleteId(null)}
                        onClick={async () => {
                          if (pendingDeleteId !== credential.id) {
                            setPendingDeleteId(credential.id);
                            return;
                          }
                          await aiCredentialsApi.remove(token, credential.id);
                          setCredentials((current) =>
                            current.filter((item) => item.id !== credential.id),
                          );
                          setPendingDeleteId(null);
                        }}
                      >
                        <Trash2 />{" "}
                        {pendingDeleteId === credential.id
                          ? "Confirm delete"
                          : "Delete"}
                      </Button>
                    </div>
                  </article>
                ))
              )}
            </section>
          </div>
        )}
        {error && (
          <p className="ai-admin-error" role="alert">
            {error}
          </p>
        )}
      </main>
      <Footer />
    </div>
  );
}
