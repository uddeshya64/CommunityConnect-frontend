"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Play, Loader2 } from "lucide-react";
import { api } from "@/lib/axios";

export default function GamificationPage() {
  const { id: eventId } = useParams();
  const router = useRouter();
  
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    fetchQuizzes();
  }, [eventId]);

  const fetchQuizzes = async () => {
    try {
      // Create a temporary fetch function assuming the route exists
      const res = await api.get(`/events/${eventId}/quizzes`);
      setQuizzes(res.data.quizzes || []);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
    } finally {
      setLoading(false);
    }
  };

  const createQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    try {
      await api.post(`/events/${eventId}/quizzes`, { title, description });
      setTitle("");
      setDescription("");
      fetchQuizzes();
    } catch (error) {
      console.error("Error creating quiz:", error);
    }
  };

  const startQuiz = async (quizId: number) => {
    try {
      await api.post(`/events/${eventId}/quizzes/${quizId}/start`);
      // Navigate to live dashboard
      router.push(`/dashboard/events/${eventId}/gamification/live?quizId=${quizId}`);
    } catch (error) {
      console.error("Error starting quiz:", error);
    }
  };

  if (loading) {
    return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gamification & Quizzes</h1>
        <p className="text-gray-500 mt-2">Manage live interactive quizzes for your attendees.</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow p-6 border border-gray-200 dark:border-zinc-800">
        <h2 className="text-xl font-bold mb-4">Create New Quiz</h2>
        <form onSubmit={createQuiz} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Quiz Title</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500" 
              placeholder="e.g. Web3 Trivia"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description (Optional)</label>
            <input 
              type="text" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500" 
              placeholder="A short description..."
            />
          </div>
          <button 
            type="submit" 
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition flex items-center gap-2"
          >
            <Plus size={18} /> Create Quiz
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Your Quizzes</h2>
        {quizzes.length === 0 ? (
          <div className="text-center p-10 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-dashed border-gray-300 dark:border-zinc-700">
            <p className="text-gray-500">No quizzes created yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="bg-white dark:bg-zinc-900 rounded-xl shadow p-6 border border-gray-200 dark:border-zinc-800 flex flex-col">
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{quiz.title}</h3>
                  <p className="text-sm text-gray-500">{quiz.description}</p>
                  <p className="text-xs font-mono mt-2 bg-gray-100 dark:bg-zinc-800 inline-block px-2 py-1 rounded">
                    Status: {quiz.status}
                  </p>
                  <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                    Questions: {quiz.questions?.length || 0}
                  </div>
                </div>
                <div className="mt-6 flex justify-between items-center pt-4 border-t border-gray-100 dark:border-zinc-800">
                  <button 
                    onClick={() => {
                      const text = prompt("Question Text?");
                      if(text) {
                        api.post(`/events/${eventId}/quizzes/${quiz.id}/questions`, {
                          text,
                          options: [
                            { text: "Option A", is_correct: true },
                            { text: "Option B", is_correct: false },
                            { text: "Option C", is_correct: false },
                            { text: "Option D", is_correct: false }
                          ]
                        }).then(() => fetchQuizzes());
                      }
                    }}
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1"
                  >
                    <Plus size={16} /> Quick Add Question
                  </button>
                  <button 
                    onClick={() => startQuiz(quiz.id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 shadow-sm shadow-green-600/20"
                  >
                    <Play size={16} /> Push Live
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
