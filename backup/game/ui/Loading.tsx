import React from "react";

const Loading: React.FC = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
      <div className="text-white text-xl">Loading...</div>
    </div>
  );
};

export default Loading;
