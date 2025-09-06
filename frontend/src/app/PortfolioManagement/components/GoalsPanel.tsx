'use client';

import React, { useState, useEffect } from 'react';
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { Badge } from "../../components/Badge";

interface Goal {
  id: string;
  name: string;
  category: string;
  targetAmount: number;
  targetDate: Date;
  priority: "high" | "medium" | "low";
  currentProgress: number;
  isActive: boolean;
  createdAt: Date;
}

interface GoalsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onGoalsUpdated: (goals: Goal[]) => void;
  baselinePlan?: any;
  previewPlan?: any | null;
  onDraftGoalChanged?: (g: any | null) => void;
}

const COMMON_GOAL_NAMES = [
  "Retirement Fund",
  "Home Down Payment", 
  "Child Education",
  "Emergency Fund",
  "Wealth Building",
  "Vacation Fund",
];

type Priority = "low" | "medium" | "high";
interface GoalForm { id: string; goalType: string; customName: string; targetAmount: string; targetDate: string; priority: Priority }

export default function GoalsPanel({ isOpen, onClose, onGoalsUpdated, baselinePlan, previewPlan, onDraftGoalChanged }: GoalsPanelProps) {
  const [form, setForm] = useState<GoalForm>({ id: '', goalType: '', customName: '', targetAmount: '', targetDate: '', priority: 'medium' });
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [deleting, setDeleting] = useState<Goal | null>(null);

  useEffect(()=>{
    if (!isOpen) return;
    setConfirm(null);
    try { const stored = JSON.parse(localStorage.getItem('investmentGoals')||'[]'); setGoals(stored||[]); } catch { setGoals([]); }
  }, [isOpen]);

  // Preview removed per UI simplification. Ensure parent preview is cleared.
  useEffect(()=>{ try { onDraftGoalChanged?.(null); } catch {} }, [isOpen, onDraftGoalChanged]);

  const save = async () => {
    const finalName = (form.goalType === 'Custom' ? form.customName : form.goalType).trim();
    if (!finalName || !form.targetAmount || !form.targetDate) return;
    setSaving(true);
    try {
      const stored: Goal[] = (()=>{ try { return JSON.parse(localStorage.getItem('investmentGoals')||'[]'); } catch { return []; } })();
      let updated: Goal[] = [];
      if (form.id) {
        updated = stored.map(g => g.id === form.id ? { ...g, name: finalName, targetAmount: Number(form.targetAmount)||0, targetDate: new Date(form.targetDate), priority: form.priority } : g);
        setConfirm('Goal updated');
      } else {
        const newGoal: Goal = { id: Date.now().toString(), name: finalName, category: 'custom', targetAmount: Number(form.targetAmount)||0, targetDate: new Date(form.targetDate), priority: form.priority, currentProgress: 0, isActive: true, createdAt: new Date() };
        updated = [...stored, newGoal];
        setConfirm('Goal added');
      }
  localStorage.setItem('investmentGoals', JSON.stringify(updated));
  setGoals(updated);
  onGoalsUpdated(updated);
  try { window.dispatchEvent(new Event('goals-updated')); } catch {}
  setForm({ id:'', goalType: '', customName: '', targetAmount: '', targetDate: '', priority: 'medium' });
  setTimeout(()=> setConfirm(null), 1500);
    } finally { setSaving(false); }
  };

  function startEdit(g: Goal) {
    const isPreset = COMMON_GOAL_NAMES.includes(g.name);
    setForm({ id: g.id, goalType: isPreset ? g.name : 'Custom', customName: isPreset ? '' : g.name, targetAmount: String(g.targetAmount||''), targetDate: (g.targetDate ? new Date(g.targetDate) : new Date()).toISOString().slice(0,10), priority: g.priority });
  }

  function confirmDelete(g: Goal) { setDeleting(g); }
  function doDelete() {
    if (!deleting) return;
    try {
      const stored: Goal[] = (()=>{ try { return JSON.parse(localStorage.getItem('investmentGoals')||'[]'); } catch { return []; } })();
      const updated = stored.filter(x => x.id !== deleting.id);
  localStorage.setItem('investmentGoals', JSON.stringify(updated));
  setGoals(updated);
  onGoalsUpdated(updated);
  try { window.dispatchEvent(new Event('goals-updated')); } catch {}
  setDeleting(null);
    } catch { setDeleting(null); }
  }

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/20 dark:bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed right-0 top-0 z-[61] h-full w-full md:w-[520px] border-l border-border bg-card text-foreground shadow-2xl">
        <div className="flex h-full">
          {/* Content */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card sticky top-0">
              <h2 className="text-base font-semibold">Investment Goals</h2>
              <button onClick={onClose} className="h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-muted">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {/* Form at top */}
                <div className="rounded-xl border border-border bg-card">
                  <div className="p-4 border-b border-border">
                    <div className="text-sm font-medium">{form.id ? 'Edit Goal' : 'Add Goal'}</div>
                    {confirm ? <div className="text-xs text-emerald-600 mt-1">{confirm}</div> : null}
                  </div>
                  <div className="p-4 space-y-3 text-sm">
                    <div>
                      <div className="text-[11px] text-muted-foreground mb-1">Goal</div>
                      <select value={form.goalType} onChange={(e)=> setForm({...form, goalType: e.target.value})} className="w-full h-11 rounded-xl border border-border px-3 bg-background text-foreground">
                        <option value="">Select goal</option>
                        {COMMON_GOAL_NAMES.map(n => (<option key={n} value={n}>{n}</option>))}
                        <option value="Custom">Custom</option>
                      </select>
                    </div>
                    {form.goalType === 'Custom' ? (
                      <div>
                        <div className="text-[11px] text-muted-foreground mb-1">Custom Name</div>
                        <Input placeholder="Enter custom goal name" value={form.customName} onChange={(e)=> setForm({...form, customName: e.target.value})} />
                      </div>
                    ) : null}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[11px] text-muted-foreground mb-1">Target amount (₹)</div>
                        <Input type="number" value={form.targetAmount} onChange={(e)=> setForm({...form, targetAmount: e.target.value})} />
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground mb-1">Target date</div>
                        <Input type="date" value={form.targetDate} onChange={(e)=> setForm({...form, targetDate: e.target.value})} />
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground mb-1">Priority</div>
                      <select value={form.priority} onChange={(e)=> setForm({...form, priority: e.target.value as any})} className="w-full h-11 rounded-xl border border-border bg-background px-3">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <Button onClick={save} disabled={saving}>{form.id ? 'Update' : 'Save'}</Button>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={()=> setForm({ id:'', goalType:'', customName:'', targetAmount:'', targetDate:'', priority:'medium' })}>Reset</Button>
                        <Button variant="outline" onClick={onClose}>Close</Button>
                      </div>
                    </div>
                  </div>
                </div>
                {/* List below */}
                <div className="rounded-xl border border-border bg-card">
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <div className="text-sm font-medium">Your Goals</div>
                    <div className="text-[11px] text-muted-foreground">{goals.length}</div>
                  </div>
                  <div className="p-2 space-y-2 max-h-[60vh] overflow-y-auto">
                    {goals.length ? goals.map(g => (
                      <div key={g.id} className="rounded-lg border border-border p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="font-medium">{g.name}</div>
                              <Badge variant={g.priority==='high' ? 'destructive' : (g.priority==='medium' ? 'outline' : 'secondary')}>{g.priority}</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">Target ₹{(g.targetAmount||0).toLocaleString()} · by {new Date(g.targetDate).toISOString().slice(0,10)}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={()=> startEdit(g)}>Edit</Button>
                            <Button variant="danger" size="sm" onClick={()=> confirmDelete(g)}>Delete</Button>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="text-xs text-muted-foreground p-3">No goals yet. Add your first goal.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {deleting ? (
              <div className="fixed inset-0 z-[62] flex items-center justify-center bg-black/40">
                <div className="w-full max-w-sm rounded-xl border border-border bg-card p-4">
                  <div className="text-sm font-medium mb-2">Delete goal?</div>
                  <div className="text-xs text-muted-foreground mb-3">This action cannot be undone. "{deleting.name}" will be removed.</div>
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" onClick={()=> setDeleting(null)}>Cancel</Button>
                    <Button variant="danger" onClick={doDelete}>Delete</Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
