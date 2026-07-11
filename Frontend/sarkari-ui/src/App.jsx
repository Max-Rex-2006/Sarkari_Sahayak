import { useState } from "react";
import axios from "axios";
import "./App.css";

const questions = [
  {
    key: "state",
    label: "आप किस राज्य में रहते हैं?",
    type: "select",
    options: ["odisha", "west_bengal", "bihar", "up"],
  },
  {
    key: "income_annual",
    label: "परिवार की सालाना आमदनी?",
    type: "number",
  },
  {
    key: "caste_category",
    label: "जाति श्रेणी?",
    type: "select",
    options: ["general", "obc", "sc", "st"],
  },
  {
    key: "is_student",
    label: "क्या परिवार में कोई छात्र है?",
    type: "boolean",
  },
  {
    key: "owns_pucca_house",
    label: "क्या पक्का मकान है?",
    type: "boolean",
  },
  {
    key: "has_ration_card",
    label: "क्या राशन कार्ड है?",
    type: "boolean",
  },
];

export default function App() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const q = questions[step];
  const currentValue = answers[q.key] ?? "";

  const isAnswered = currentValue !== "" && currentValue !== null;

  function updateAnswer(value) {
    setAnswers((prev) => ({ ...prev, [q.key]: value }));
  }

  function handleBooleanAnswer(value) {
    updateAnswer(value);
    if (step < questions.length - 1) {
      setStep((prevStep) => prevStep + 1);
    } else {
      submitAnswers({ ...answers, [q.key]: value });
    }
  }

  function handleNext() {
    if (!isAnswered) {
      setError("कृपया इस प्रश्न का उत्तर दें।");
      return;
    }
    setError("");
    if (step < questions.length - 1) {
      setStep((prevStep) => prevStep + 1);
    } else {
      submitAnswers(answers);
    }
  }

  function handleBack() {
    setError("");
    if (step > 0) {
      setStep((prevStep) => prevStep - 1);
    }
  }

  async function submitAnswers(data) {
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(
        "http://localhost:8000/check-eligibility",
        data,
      );
      setResult(res.data);
    } catch {
      setError(
        "सबमिट करते समय कोई समस्या हुई। कृपया बाद में पुनः प्रयास करें।",
      );
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <main className="wizard">
        <h1>परिणाम</h1>
        <p>आपके लिए {result.total_found} योजनाएं मिलीं</p>
        <div className="result-list">
          {result.qualifying_schemes?.map((scheme) => (
            <article key={scheme.id} className="result-card">
              <h2>{scheme.name_hi}</h2>
              <p>{scheme.description}</p>
            </article>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="wizard">
      <h1>Phase 1 प्रश्नावली</h1>
      <div className="progress">
        {step + 1} / {questions.length}
      </div>
      <section className="question-card">
        <h2>{q.label}</h2>

        {q.type === "select" && (
          <select
            value={currentValue}
            onChange={(event) => updateAnswer(event.target.value)}
          >
            <option value="">-- एक विकल्प चुनें --</option>
            {q.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )}

        {q.type === "number" && (
          <input
            type="number"
            value={currentValue}
            onChange={(event) => updateAnswer(event.target.value)}
            placeholder="संख्या दर्ज करें"
          />
        )}

        {q.type === "boolean" && (
          <div className="boolean-buttons">
            <button type="button" onClick={() => handleBooleanAnswer(true)}>
              हाँ
            </button>
            <button type="button" onClick={() => handleBooleanAnswer(false)}>
              नहीं
            </button>
          </div>
        )}

        {q.type !== "boolean" && (
          <div className="actions">
            <button type="button" onClick={handleBack} disabled={step === 0}>
              पिछला
            </button>
            <button type="button" onClick={handleNext} disabled={loading}>
              {step < questions.length - 1 ? "अगला" : "सबमिट करें"}
            </button>
          </div>
        )}

        {error && <p className="error">{error}</p>}
        {loading && <p className="loading">सबमिट कर रहे हैं…</p>}
      </section>
    </main>
  );
}
