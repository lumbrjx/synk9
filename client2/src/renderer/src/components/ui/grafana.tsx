const GrafanaDashboard = () => {
  return (
    <div style={{ width: '100%', height: '600px' }}>
      <iframe
        src="http://localhost:3000/d/sensor-dashboard/auto?orgId=1&refresh=5s&kiosk"
        width="100%"
        height="600"

        title="Grafana Dashboard"
      />
    </div>
  );
};

export default GrafanaDashboard;
