import Swal from 'sweetalert2';

// Success toast notification
export const showSuccessToast = (message) => {
    Swal.fire({
        toast: true,
        position: 'bottom-end',
        icon: 'success',
        title: message,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
    });
};

// Error toast notification
export const showErrorToast = (message) => {
    Swal.fire({
        toast: true,
        position: 'bottom-end',
        icon: 'error',
        title: message,
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
    });
};

// Warning toast notification
export const showWarningToast = (message) => {
    Swal.fire({
        toast: true,
        position: 'bottom-end',
        icon: 'warning',
        title: message,
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
    });
};

// Info toast notification
export const showInfoToast = (message) => {
    Swal.fire({
        toast: true,
        position: 'bottom-end',
        icon: 'info',
        title: message,
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
    });
};

// Confirmation dialog
export const showConfirmDialog = async ({ title = 'Are you sure?', text = "You won't be able to revert this!" }) => {
    const result = await Swal.fire({
        title: title,
        text: text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes',
        cancelButtonText: 'Cancel',
    });

    return result;
};

// Input dialog
export const showInputDialog = async ({ title = 'Input', text = 'Please enter a value:', inputPlaceholder = '' }) => {
    const result = await Swal.fire({
        title: title,
        text: text,
        input: 'text',
        inputPlaceholder: inputPlaceholder,
        showCancelButton: true,
        confirmButtonText: 'Submit',
        cancelButtonText: 'Cancel',
        inputValidator: (value) => {
            if (!value) {
                return 'You need to write something!';
            }
        }
    });

    return result;
};

// Loading dialog
export const showLoadingDialog = (message = 'Loading...') => {
    Swal.fire({
        title: message,
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
            Swal.showLoading();
        },
    });
};

// Close loading dialog
export const closeLoadingDialog = () => {
    Swal.close();
};

// Custom alert dialog
export const showAlertDialog = ({ title, text, icon = 'info', confirmButtonText = 'OK' }) => {
    Swal.fire({
        title: title,
        text: text,
        icon: icon,
        confirmButtonText: confirmButtonText,
    });
};
