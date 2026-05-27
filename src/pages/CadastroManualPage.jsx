import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ManualStudentModal } from './AlunosPage';

export default function CadastroManualPage() {
  const { students, courses, addManualStudent } = useApp();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      return await addManualStudent(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="card max-w-5xl mx-auto">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900">Cadastro manual de alunos</h2>
            <p className="text-sm text-gray-500 mt-1">
              Cadastre a empresa contratante, escolha o curso e inclua um ou mais alunos com certificado assinado.
            </p>
          </div>
        </div>
      </div>

      <ManualStudentModal
        embedded
        isOpen
        onClose={() => {}}
        courses={courses}
        students={students}
        onSubmit={handleSubmit}
        loading={saving}
      />
    </div>
  );
}
