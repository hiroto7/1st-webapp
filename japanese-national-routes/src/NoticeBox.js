// @ts-check
import React from 'react';
import './Notice.css';

/** @typedef {{ type: 'info' | 'warn' | 'error', message: string }} Notice */

/** @param {{ notice: Notice }} props */
const NoticeBox = props => (<div className="notice" data-type={props.notice.type}>{props.notice.message}</div>);

export default NoticeBox;
