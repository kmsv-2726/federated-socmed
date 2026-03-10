import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage';

const ImageCropperModal = ({ imageSrc, onComplete, onCancel, aspect = 3 / 1 }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = async () => {
        try {
            const croppedImageBase64 = await getCroppedImg(imageSrc, croppedAreaPixels);
            onComplete(croppedImageBase64);
        } catch (e) {
            console.error(e);
            alert('Failed to crop image');
        }
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <div style={styles.cropContainer}>
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspect}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                    />
                </div>
                <div style={styles.controls}>
                    <label style={{ marginRight: '10px' }}>Zoom</label>
                    <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-labelledby="Zoom"
                        onChange={(e) => setZoom(e.target.value)}
                        style={styles.slider}
                    />
                </div>
                <div style={styles.actions}>
                    <button style={styles.cancelBtn} onClick={onCancel}>
                        Cancel
                    </button>
                    <button style={styles.saveBtn} onClick={handleSave}>
                        Crop & Save
                    </button>
                </div>
            </div>
        </div>
    );
};

const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    modal: {
        width: '90%',
        maxWidth: '600px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    },
    cropContainer: {
        position: 'relative',
        width: '100%',
        height: '400px',
        backgroundColor: '#333',
    },
    controls: {
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: '1px solid #eee',
    },
    slider: {
        width: '50%',
    },
    actions: {
        display: 'flex',
        justifyContent: 'flex-end',
        padding: '16px',
        gap: '10px',
        backgroundColor: '#f9fafb',
    },
    saveBtn: {
        padding: '8px 16px',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold',
    },
    cancelBtn: {
        padding: '8px 16px',
        backgroundColor: 'transparent',
        color: '#4b5563',
        border: '1px solid #d1d5db',
        borderRadius: '4px',
        cursor: 'pointer',
    },
};

export default ImageCropperModal;
