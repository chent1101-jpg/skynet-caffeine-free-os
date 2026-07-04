export default function StatusBar() {
  return (
    <div className="statusbar">
      <div className="sb-item"><div className="sb-dot g" />VPS ONLINE</div>
      <div className="sb-item"><div className="sb-dot g" />HERMES v0.17.0</div>
      <div className="sb-item"><div className="sb-dot g" />2 CRONS ACTIVE</div>
      <div className="sb-item"><div className="sb-dot o" />N8N CONFIGURING</div>
      <div className="sb-item"><div className="sb-dot b" />MODEL: DEEPSEEK V4 FLASH</div>
      <div className="sb-item sb-right">HERMES OS v2.0 · REACT</div>
    </div>
  );
}
