// @ts-check
import React from 'react';

/** @extends {React.Component<{ length: number }, { value: number }>} */
export default class Arrow extends React.Component {
    /** @type {number | null} */
    animationFrame = null;

    /** @param {{ length: number }} props */
    constructor(props) {
        super(props);
        this.state = { value: 0 };
    }

    componentDidMount() {
        /** @param {number} time */
        const callback = time => {
            const value = Math.floor(time / 250) % Math.ceil(this.props.length + 1);
            if (this.state.value !== value) {
                this.setState({ value });
            }
            this.animationFrame = requestAnimationFrame(callback);
        };
        this.animationFrame = requestAnimationFrame(callback);
    }

    componentWillUnmount() {
        if (this.animationFrame !== null) {
            cancelAnimationFrame(this.animationFrame);
        }
    }

    render() {
        const parts = [];
        for (let i = 0; i < this.props.length; i++) {
            parts.push(<span style={{ color: i < this.state.value ? 'white' : 'rgba(255, 255, 255, .5)' }}>&gt;</span>)
        }
        return (<div style={{ letterSpacing: '-.25em' }}>{parts}</div >)
    }
}