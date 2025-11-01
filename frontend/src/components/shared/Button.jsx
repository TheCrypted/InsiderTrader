const Button = ({ children, variant = 'yellow', className = '', onClick, type = 'button', ...props }) => {
  const baseClasses = 'c-btn inline-flex items-center justify-center px-6 py-3 rounded-full font-medium transition-colors duration-200';
  
  const variantClasses = {
    yellow: 'c-btn--yellow bg-gresearch-yellow text-black hover:bg-opacity-90',
    default: 'bg-gray-200 text-black hover:bg-gray-300',
    link: 'text-blue-600 hover:text-blue-800 underline'
  };
  
  return (
    <button
      type={type}
      className={`${baseClasses} ${variantClasses[variant] || variantClasses.default} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
      <span className="c-btn__icons ml-2">→</span>
    </button>
  );
};

export default Button;

