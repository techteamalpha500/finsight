# Allocation Engine Documentation

This document explains the steps and logic used to calculate portfolio allocation in Finsight, based on the user's questionnaire, investment goals, and optional AI enhancements.

---

## 1. Inputs

### a. Questionnaire
- Age
- Investment Horizon
- Annual Income
- Investment Amount
- Emergency Fund Months
- Dependents
- Volatility Comfort (Risk Tolerance)
- Other profile questions

### b. Investment Goals (Optional)
- Each goal: type, target amount, target date, priority
- Goals are used to adjust asset mix and risk profile

### c. Holdings (Current Portfolio)
- Used for rebalancing and stress tests

---

## 2. Baseline Allocation Calculation (No Goals)

1. **Risk Profile Calculation**
   - Age, horizon, income, dependents, and volatility comfort are scored.
   - A risk level (e.g., Conservative, Balanced, Aggressive) is assigned.

2. **Asset Class Bucketing**
   - Based on risk level, the engine sets target percentages for asset classes:
     - Equity (Stocks, Mutual Funds)
     - Defensive (Debt, Liquid)
     - Satellite (Gold, Real Estate)
   - Policy rules (e.g., equity cap for age, minimum liquid for emergency fund) are applied.

3. **Constraints**
   - Emergency fund: If <6 months, more liquid assets are allocated.
   - Income/dependents: May reduce risk and increase defensive assets.

4. **Final Mix**
   - The engine outputs a recommended allocation (e.g., 60% Equity, 30% Defensive, 10% Satellite).

---

## 3. Allocation with Goals

1. **Goal Analysis**
   - Each goal is analyzed for time horizon, target amount, and priority.
   - Short-term/high-priority goals increase defensive allocation.
   - Long-term goals allow more equity.

2. **Blended Plan**
   - The engine blends baseline allocation with goal-driven adjustments.
   - If multiple goals, a weighted average is used based on priority and time.
   - Stress tests may be run to ensure goals are achievable with the mix.

3. **Impact Calculation**
   - The engine shows how adding/editing goals changes the allocation (e.g., "Equity +3%, Debt –2%").

---

## 4. AI-Enhanced Allocation (Optional)

1. **AI Plan Suggestion**
   - The engine sends the questionnaire and baseline plan to an AI service.
   - AI may use external data, market conditions, or advanced optimization.
   - AI returns a suggested mix and rationale.

2. **Comparison & Explanation**
   - The app compares baseline and AI mix, showing differences and rationale.
   - Users can choose to accept the AI plan or stick with the baseline.

---

## 5. Calculation Steps (Pseudocode)

```
function buildPlan(questionnaire, goals = []) {
  riskLevel = scoreRisk(questionnaire)
  baseMix = getPolicyMix(riskLevel, questionnaire)
  if (goals.length > 0) {
    goalMix = blendGoals(baseMix, goals)
    allocation = applyConstraints(goalMix, questionnaire)
  } else {
    allocation = applyConstraints(baseMix, questionnaire)
  }
  return allocation
}
```

- `scoreRisk`: Scores user profile for risk.
- `getPolicyMix`: Returns asset class percentages for risk level.
- `blendGoals`: Adjusts mix for each goal's time/priority.
- `applyConstraints`: Applies rules for emergency fund, income, etc.

---


## 6. Fully Detailed Example (Reproducible)

### Sample Questionnaire

| Field                | Value         |
|----------------------|--------------|
| Age                  | 35           |
| Investment Horizon   | 10 years     |
| Annual Income        | ₹2,00,000    |
| Investment Amount    | ₹5,00,000    |
| Emergency Fund       | 3 months     |
| Dependents           | 2            |
| Volatility Comfort   | stay calm    |

### 1. Risk Scoring

**Weights:**
- Age: 20%
- Horizon: 20%
- Income: 10%
- Emergency Fund: 10%
- Dependents: 10%
- Volatility Comfort: 30%

**Scoring Table:**
- Age 35: Score = 3 (on scale 1-5)
- Horizon 10y: Score = 4
- Income 2L: Score = 3
- Emergency Fund 3m: Score = 2
- Dependents 2: Score = 2
- Volatility Comfort "stay calm": Score = 4

**Weighted Risk Score:**

   riskScore = (3*0.2) + (4*0.2) + (3*0.1) + (2*0.1) + (2*0.1) + (4*0.3)
          = (0.6) + (0.8) + (0.3) + (0.2) + (0.2) + (1.2)
          = 3.3

**Risk Level Mapping:**
- Conservative: 1.0–2.4
- Balanced: 2.5–3.7
- Aggressive: 3.8–5.0

**Result:**
- riskScore = 3.3 → Balanced

### 2. Baseline Asset Allocation (Policy Table)

| Risk Level   | Equity | Defensive | Satellite |
|--------------|--------|-----------|-----------|
| Conservative | 30%    | 60%       | 10%       |
| Balanced     | 55%    | 35%       | 10%       |
| Aggressive   | 70%    | 20%       | 10%       |

**Result:**
- Baseline: 55% Equity, 35% Defensive, 10% Satellite

### 3. Apply Constraints

- Emergency Fund < 6 months: Increase Liquid by 5%, reduce Equity by 5%
- Dependents > 0: Reduce Equity by 5%, increase Defensive by 5%

**Calculation:**
- Start: 55% Equity, 35% Defensive, 10% Satellite
- Emergency Fund: 50% Equity, 35% Defensive, 10% Satellite, 5% Liquid (from Defensive)
- Dependents: 45% Equity, 40% Defensive, 10% Satellite, 5% Liquid

### 4. Add Investment Goal

- Goal: Buy house in 3 years, ₹10,00,000, high priority
- Short horizon (<5 years) and high priority: Shift 10% from Equity to Defensive

**Calculation:**
- Before goal: 45% Equity, 40% Defensive, 10% Satellite, 5% Liquid
- After goal: 35% Equity, 50% Defensive, 10% Satellite, 5% Liquid

### 5. Final Allocation

| Asset Class   | Percentage |
|--------------|------------|
| Equity       | 35%        |
| Defensive    | 50%        |
| Satellite    | 10%        |
| Liquid       | 5%         |


### 6. Groq AI Calculation (Explicit)

#### Step-by-Step
1. **Input Preparation**
    - The app sends the following JSON to Groq AI:
       ```json
       {
          "questionnaire": {
             "age": 35,
             "horizon": 10,
             "income": 2,
             "emergency": 3,
             "dependents": 2,
             "volatility": 4
          },
          "goals": [
             {"priority": "high", "horizon": 3}
          ],
          "baseline": [35, 50, 10, 5]
       }
       ```

2. **Groq AI Processing**
    - Groq AI receives the input and applies its own logic:
       - May use market data, historical returns, risk models, and optimization algorithms.
       - May adjust asset class weights for current conditions or goal achievability.
       - Returns a suggested allocation and rationale.

3. **Groq AI Output Example**
    ```json
    {
       "aiPlan": {
          "equity": 40,
          "defensive": 45,
          "satellite": 10,
          "liquid": 5
       },
       "rationale": "Based on current market volatility and your short-term goal, a slight increase in equity is recommended to balance growth and safety."
    }
    ```

4. **Integration**
    - The app compares the Groq AI plan to the baseline.
    - Shows the difference and rationale to the user.
    - User can accept the Groq AI plan or stick with the baseline.

#### Reproducible Example

If you send the above input to Groq AI, you should expect the output allocation and rationale as shown. The process is deterministic for the same input and Groq AI model version.

---

```python
# Constants
WEIGHTS = {
   'age': 0.2,
   'horizon': 0.2,
   'income': 0.1,
   'emergency': 0.1,
   'dependents': 0.1,
   'volatility': 0.3
}
RISK_TABLE = {
   'Conservative': {'min': 1.0, 'max': 2.4, 'mix': [30, 60, 10]},
   'Balanced': {'min': 2.5, 'max': 3.7, 'mix': [55, 35, 10]},
   'Aggressive': {'min': 3.8, 'max': 5.0, 'mix': [70, 20, 10]}
}

def score_risk(q):
   scores = {'age': 3, 'horizon': 4, 'income': 3, 'emergency': 2, 'dependents': 2, 'volatility': 4}
   return sum(scores[k]*WEIGHTS[k] for k in scores)

def get_mix(risk_score):
   for k, v in RISK_TABLE.items():
      if v['min'] <= risk_score <= v['max']:
         return v['mix']

def apply_constraints(mix, q):
   equity, defensive, satellite = mix
   liquid = 0
   if q['emergency'] < 6:
      equity -= 5
      liquid += 5
   if q['dependents'] > 0:
      equity -= 5
      defensive += 5
   return [equity, defensive, satellite, liquid]

def blend_goals(mix, goals):
   equity, defensive, satellite, liquid = mix
   for g in goals:
      if g['priority'] == 'high' and g['horizon'] < 5:
         equity -= 10
         defensive += 10
   return [equity, defensive, satellite, liquid]

# Example usage
q = {'age': 35, 'horizon': 10, 'income': 2, 'emergency': 3, 'dependents': 2, 'volatility': 4}
goals = [{'priority': 'high', 'horizon': 3}]
risk_score = score_risk(q) # 3.3
mix = get_mix(risk_score) # [55, 35, 10]
mix = apply_constraints(mix, q) # [45, 40, 10, 5]
final = blend_goals(mix, goals) # [35, 50, 10, 5]
```

---