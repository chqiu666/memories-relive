'use client'

import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { useStore } from '@/store'

/**
 * Invisible component inside Canvas that intercepts pointer clicks
 * when raycastMode is enabled. Casts a ray against all Points meshes
 * in the scene and stores the hit coordinate + copies to clipboard.
 */
export function CoordPicker() {
    const { scene, camera, gl } = useThree()
    const raycasterRef = useRef(new THREE.Raycaster())

    // Set a generous threshold for point cloud raycasting
    raycasterRef.current.params.Points = { threshold: 0.1 }

    const handleClick = useCallback((event: PointerEvent) => {
        const { raycastMode } = useStore.getState()
        if (!raycastMode) return

        const rect = gl.domElement.getBoundingClientRect()
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1,
        )

        raycasterRef.current.setFromCamera(mouse, camera)

        // Collect all Points objects in scene
        const pointObjects: THREE.Points[] = []
        scene.traverse((obj) => {
            if ((obj as THREE.Points).isPoints) {
                pointObjects.push(obj as THREE.Points)
            }
        })

        const intersections = raycasterRef.current.intersectObjects(pointObjects, false)

        if (intersections.length > 0) {
            const hit = intersections[0].point
            const coord: [number, number, number] = [
                parseFloat(hit.x.toFixed(4)),
                parseFloat(hit.y.toFixed(4)),
                parseFloat(hit.z.toFixed(4)),
            ]
            useStore.getState().set({ pickedCoord: coord })

            // Copy to clipboard
            const coordStr = `[${coord[0]}, ${coord[1]}, ${coord[2]}]`
            navigator.clipboard.writeText(coordStr).catch(() => {
                console.log('Picked coord:', coordStr)
            })
        }
    }, [scene, camera, gl])

    // Subscribe to raycastMode changes and attach/detach listener
    useEffect(() => {
        const unsubscribe = useStore.subscribe((state, prev) => {
            if (state.raycastMode && !prev.raycastMode) {
                gl.domElement.addEventListener('pointerdown', handleClick)
                gl.domElement.style.cursor = 'crosshair'
            } else if (!state.raycastMode && prev.raycastMode) {
                gl.domElement.removeEventListener('pointerdown', handleClick)
                gl.domElement.style.cursor = 'auto'
            }
        })

        // Attach if already enabled on mount
        if (useStore.getState().raycastMode) {
            gl.domElement.addEventListener('pointerdown', handleClick)
            gl.domElement.style.cursor = 'crosshair'
        }

        return () => {
            unsubscribe()
            gl.domElement.removeEventListener('pointerdown', handleClick)
            gl.domElement.style.cursor = 'auto'
        }
    }, [gl, handleClick])

    return null
}
