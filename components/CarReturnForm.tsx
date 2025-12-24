import React, { useState, useEffect } from 'react';
import { UrlParams, Condition, PhotoData, CarReturnPayload, TaskSummary } from '../types';
import { Card } from './ui/Card';
import { SignaturePad } from './SignaturePad';
import { submitCarReturn, getFlowDetail } from '../services/api';

interface CarReturnFormProps {
  params: UrlParams;
}

export const CarReturnForm: React.FC<CarReturnFormProps> = ({ params }) => {
  const assetType = React.useMemo<'FRIDGE' | 'CAR'>(() => {
    return params.assetType?.toUpperCase() === 'CAR' ? 'CAR' : 'FRIDGE';
  }, [params.assetType]);

  // --- State ---
  const [flowIdState, setFlowIdState] = useState(params.flowId || '');
  const [roomId, setRoomId] = useState(params.roomId || '');
  const [taskId, setTaskId] = useState(params.taskId || '');
  const [tasks, setTasks] = useState<TaskSummary[] | null>(null);

  const [inspector, setInspector] = useState('');
  const [returned, setReturned] = useState<boolean | null>(null);
  const [condition, setCondition] = useState<Condition | ''>('');
  const [notes, setNotes] = useState('');
  const [deduction, setDeduction] = useState<string>('');
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{
    roomId: string;
    inspector: string;
    condition: Condition | '';
    deduction?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);

  // Fetch flow detail to backfill room/task
  useEffect(() => {
    const fetchMeta = async () => {
      if (!flowIdState) return;
      setLoadingMeta(true);
      try {
        const res = await getFlowDetail(flowIdState);
        if (res.ok) {
          if (!roomId && res.flow?.roomId) setRoomId(res.flow.roomId);
          if (!taskId && res.tasks?.length) {
            const match = res.tasks.find((t) => t.type === assetType);
            if (match?.taskId) setTaskId(match.taskId);
          }
          if (res.tasks) setTasks(res.tasks);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingMeta(false);
      }
    };
    fetchMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowIdState]);

  // --- Handlers ---

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files) as File[];
      const processedPhotos: PhotoData[] = [];

      for (const file of newFiles) {
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
          });

          processedPhotos.push({
            id: Math.random().toString(36).substring(7),
            file,
            name: file.name,
            mime: file.type,
            base64: base64,
            previewUrl: URL.createObjectURL(file),
          });
        } catch (err) {
          console.error("Error reading file", err);
        }
      }
      setPhotos((prev) => [...prev, ...processedPhotos]);
    }
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!flowIdState || !taskId || !roomId) {
      setError('ขาดข้อมูล flowId/taskId/roomId');
      return;
    }
    if (!inspector) {
      setError('กรุณาเลือกผู้ตรวจ');
      return;
    }
    if (returned === null) {
      setError('กรุณาระบุว่าคืนตู้เย็นหรือยัง');
      return;
    }
    if (!condition) {
      setError('กรุณาระบุสภาพหลังคืน (Please select condition)');
      return;
    }

    if (photos.length === 0) {
      setError('กรุณาอัปโหลดรูปภาพประกอบอย่างน้อย 1 รูป (Please upload at least 1 photo)');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: CarReturnPayload = {
        flowId: flowIdState,
        taskId: taskId,
        roomId: roomId,
        assetType: assetType,
        inspector,
        returned: returned,
        conditionAfter: condition as Condition,
        notes: notes,
        deduction: deduction ? parseFloat(deduction) : undefined,
        photos: photos.map((p) => ({
          name: p.name,
          mime: p.mime,
          base64: p.base64.split(',')[1], // Strip data prefix
        })),
        signature: signature ? signature.split(',')[1] : undefined,
      };

      const result = await submitCarReturn(payload);
      if (result.ok !== false) {
        setSuccessData({
          roomId,
          inspector,
          condition,
          deduction: deduction || undefined,
        });
        setIsSuccess(true);
      } else {
        setError('เกิดข้อผิดพลาดจากระบบ: ' + (result.message || ''));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Submission failed';
      setError('เกิดข้อผิดพลาดในการส่งข้อมูล: ' + message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Render ---

  const conditionLabel = (c: Condition | '') => {
    if (c === Condition.OK) return 'ปกติ';
    if (c === Condition.DENT) return 'มีรอยบุบ';
    if (c === Condition.BROKEN) return 'แตกหัก';
    if (c === Condition.MISSING) return 'สูญหาย';
    return '-';
  };

  if (isSuccess && successData) {
    return (
      <div className="min-h-screen bg-slate-50 pb-16 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-72 bg-gradient-to-b from-green-50 to-transparent pointer-events-none" />
        <div className="max-w-lg mx-auto px-6 pt-12 relative z-10 text-center">
          <div className="w-24 h-24 bg-green-500 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg shadow-green-200">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">บันทึกสำเร็จ</h2>
          <p className="text-slate-500 mb-6">ข้อมูลการรับตู้เย็นถูกส่งเรียบร้อยแล้ว</p>

          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-white/60 text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">ห้อง</span>
              <span className="text-lg font-bold text-slate-800">{successData.roomId || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">ผู้ตรวจ</span>
              <span className="text-sm font-semibold text-slate-700">{successData.inspector || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">สภาพหลังคืน</span>
              <span className="text-sm font-semibold text-slate-700">{conditionLabel(successData.condition)}</span>
            </div>
            {successData.deduction && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">ยอดหัก/เรียกเก็บ</span>
                <span className="text-sm font-semibold text-red-600">{successData.deduction} บาท</span>
              </div>
            )}
          </div>

          <div className="mt-10 space-y-3">
            <button
              onClick={() => window.close()}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-green-200 transition-transform active:scale-95"
            >
              ปิดหน้าต่าง
            </button>
            <a
              href="/"
              className="block w-full bg-white text-slate-600 font-medium py-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              กลับไปหน้าหลัก
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-20">
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Header Metadata */}
        <Card className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-none">
          <div className="flex flex-col space-y-1">
             <div className="flex justify-between items-center">
                <span className="text-indigo-100 text-xs uppercase font-bold tracking-wider">Room ID</span>
                <span className="text-xl font-bold">{roomId || 'N/A'}</span>
             </div>
             <div className="flex justify-between text-indigo-100 text-sm">
                <span>Task: {taskId || '-'}</span>
                <span className="opacity-75">#{flowIdState ? flowIdState.slice(-4) : '----'}</span>
             </div>
             {loadingMeta && <div className="text-xs text-indigo-100">กำลังโหลดข้อมูล...</div>}
          </div>
        </Card>

        {/* 1. Status Check */}
        <Card title="สถานะการคืน (Return Status)">
          <div className="flex flex-col space-y-3">
            <p className="text-slate-700 font-medium">คืนตู้เย็นแล้วหรือยัง?</p>
            <div className="grid grid-cols-2 gap-4">
              <label className={`relative flex flex-col items-center p-4 border rounded-xl cursor-pointer transition-all ${returned === true ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input 
                  type="radio" 
                  name="returned" 
                  className="sr-only" 
                  checked={returned === true} 
                  onChange={() => setReturned(true)} 
                />
                <span className={`text-lg font-bold ${returned === true ? 'text-indigo-700' : 'text-slate-600'}`}>คืนแล้ว</span>
                <span className="text-xs text-slate-500 mt-1">Returned</span>
              </label>

              <label className={`relative flex flex-col items-center p-4 border rounded-xl cursor-pointer transition-all ${returned === false ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input 
                  type="radio" 
                  name="returned" 
                  className="sr-only" 
                  checked={returned === false} 
                  onChange={() => setReturned(false)} 
                />
                <span className={`text-lg font-bold ${returned === false ? 'text-amber-700' : 'text-slate-600'}`}>ยังไม่คืน</span>
                <span className="text-xs text-slate-500 mt-1">Not Returned</span>
              </label>
            </div>
          </div>
        </Card>

        {/* 2. Condition & Assessment */}
        <Card title="การประเมินสภาพ (Assessment)">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">สภาพหลังคืน (Condition) <span className="text-red-500">*</span></label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as Condition)}
                className="block w-full rounded-lg border-slate-300 bg-slate-50 border p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="" disabled>-- กรุณาเลือก --</option>
                <option value={Condition.OK}>ปกติ (Normal)</option>
                <option value={Condition.DENT}>มีรอยบุบ (Dented)</option>
                <option value={Condition.BROKEN}>แตกหัก (Broken)</option>
                <option value={Condition.MISSING}>สูญหาย (Missing)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุเพิ่มเติม (Notes)</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="รายละเอียดเพิ่มเติม..."
                className="block w-full rounded-lg border-slate-300 bg-white border p-2.5 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ยอดหัก/เรียกเก็บ (Deduction) - บาท</label>
              <input
                type="number"
                value={deduction}
                onChange={(e) => setDeduction(e.target.value)}
                placeholder="0.00"
                className="block w-full rounded-lg border-slate-300 bg-white border p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </Card>

        {/* 3. Photos */}
        <Card title={
          <span className="flex items-center">
            รูปภาพประกอบ (Photos)
            <span className="text-red-500 ml-1 text-base">*</span>
          </span>
        }>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200">
                  <img src={photo.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md opacity-90 hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
              
              <label className={`flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                  photos.length === 0 
                  ? 'border-red-300 bg-red-50 hover:bg-red-100' 
                  : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
                }`}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className={`w-8 h-8 mb-2 ${photos.length === 0 ? 'text-red-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p className={`text-xs ${photos.length === 0 ? 'text-red-500' : 'text-slate-500'}`}>
                    {photos.length === 0 ? 'จำเป็นต้องเพิ่มรูปภาพ' : 'เพิ่มรูปภาพ'}
                  </p>
                </div>
                <input type="file" className="hidden" multiple accept="image/*" onChange={handleFileChange} />
              </label>
            </div>
          </div>
        </Card>

        {/* 4. Inspector & Signature */}
        <Card title="ผู้ตรวจสอบและลายเซ็น">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ผู้ตรวจ</label>
              <select
                value={inspector}
                onChange={(e) => setInspector(e.target.value)}
                className="block w-full rounded-lg border-slate-300 bg-white border p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">-- เลือกผู้ตรวจ --</option>
                <option value="Ma">Ma</option>
                <option value="KK">KK</option>
                <option value="Kaopan">Kaopan</option>
                <option value="พี่ก้อย">พี่ก้อย</option>
                <option value="พี่ยุ">พี่ยุ</option>
              </select>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">ลายเซ็นผู้ตรวจสอบ</p>
              <SignaturePad onChange={setSignature} />
            </div>
          </div>
        </Card>

        {/* Errors */}
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-100 text-center animate-pulse">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 flex justify-center z-10 md:relative md:bg-transparent md:border-none md:p-0">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full max-w-lg md:max-w-none shadow-lg rounded-xl py-3.5 px-6 font-bold text-lg text-white transition-all transform active:scale-95
              ${isSubmitting 
                ? 'bg-slate-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
              }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                กำลังบันทึก...
              </span>
            ) : (
              'บันทึกข้อมูล (Submit)'
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
