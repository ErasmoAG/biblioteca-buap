export default function EnConstruccion({ titulo, descripcion }) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-buap-navy">{titulo}</h1>
      <p className="mt-1 text-slate-500">{descripcion}</p>
      <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
        Esta pantalla se construye en una fase siguiente.
      </div>
    </div>
  );
}
