"use client"
import { Users, CheckCircle2, AlertCircle, FileText, GraduationCap, BookOpen, Shirt } from "lucide-react";

export default function StatsGrid({ stats, activeFilter, setActiveFilter }) {
  const cards = [
    {
      id: "all",
      label: "Total Passout Students",
      value: stats?.total || 0,
      icon: Users,
      color: "blue",
    },
    {
      id: "paid",
      label: "Fully Paid",
      value: stats?.fullyPaid || 0,
      icon: CheckCircle2,
      color: "emerald",
    },
    {
      id: "pending",
      label: "Pending Fees",
      value: `₹${(stats?.pendingAmount || 0).toLocaleString()}`,
      subValue: `${stats?.pendingCount || 0} Students`,
      icon: AlertCircle,
      color: "rose",
    },
    {
      id: "tc",
      label: "TC Taken",
      value: stats?.tcTaken || 0,
      icon: FileText,
      color: "amber",
    },
    {
      id: "result",
      label: "Result Collected",
      value: stats?.resultCollected || 0,
      icon: GraduationCap,
      color: "indigo",
    },
    {
      id: "no-books",
      label: "Books Not Paid",
      value: stats?.booksNotPaid || 0,
      icon: BookOpen,
      color: "purple",
    },
    {
      id: "no-uniform",
      label: "Uniform Not Paid",
      value: stats?.uniformNotPaid || 0,
      icon: Shirt,
      color: "orange",
    },
  ];

  const getColorClasses = (color, isActive) => {
    const map = {
      blue: {
        bg: "bg-blue-50/50",
        border: "border-blue-100/50",
        iconText: "text-blue-600",
        labelText: "text-blue-800",
        activeBorder: "border-blue-500",
        activeRing: "ring-blue-500/20"
      },
      emerald: {
        bg: "bg-emerald-50/50",
        border: "border-emerald-100/50",
        iconText: "text-emerald-600",
        labelText: "text-emerald-800",
        activeBorder: "border-emerald-500",
        activeRing: "ring-emerald-500/20"
      },
      rose: {
        bg: "bg-rose-50/50",
        border: "border-rose-100/50",
        iconText: "text-rose-600",
        labelText: "text-rose-800",
        activeBorder: "border-rose-500",
        activeRing: "ring-rose-500/20"
      },
      amber: {
        bg: "bg-amber-50/50",
        border: "border-amber-100/50",
        iconText: "text-amber-600",
        labelText: "text-amber-800",
        activeBorder: "border-amber-500",
        activeRing: "ring-amber-500/20"
      },
      indigo: {
        bg: "bg-indigo-50/50",
        border: "border-indigo-100/50",
        iconText: "text-indigo-600",
        labelText: "text-indigo-800",
        activeBorder: "border-indigo-500",
        activeRing: "ring-indigo-500/20"
      },
      purple: {
        bg: "bg-purple-50/50",
        border: "border-purple-100/50",
        iconText: "text-purple-600",
        labelText: "text-purple-800",
        activeBorder: "border-purple-500",
        activeRing: "ring-purple-500/20"
      },
      orange: {
        bg: "bg-orange-50/50",
        border: "border-orange-100/50",
        iconText: "text-orange-600",
        labelText: "text-orange-800",
        activeBorder: "border-orange-500",
        activeRing: "ring-orange-500/20"
      }
    };
    return map[color] || map.blue;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeFilter === card.id;
        const colors = getColorClasses(card.color, isActive);

        return (
          <button
            key={card.id}
            onClick={() => setActiveFilter(card.id)}
            className={`rounded-xl shadow-sm p-6 flex items-center border transition-all text-left group ${
              isActive
                ? `${colors.bg} ${colors.activeBorder} ring-4 ${colors.activeRing} transform scale-[1.02]`
                : `${colors.bg} ${colors.border} hover:shadow-md hover:scale-[1.01]`
            }`}
          >
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mr-4 shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300">
              <Icon className={`w-7 h-7 ${colors.iconText}`} />
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-medium truncate ${colors.labelText}`}>{card.label}</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-bold text-gray-900 leading-none">{card.value}</span>
                {card.subValue && (
                  <span className={`text-[10px] font-bold uppercase tracking-tight ${card.color === 'rose' ? 'text-rose-600' : 'text-gray-400'}`}>
                    {card.subValue}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
